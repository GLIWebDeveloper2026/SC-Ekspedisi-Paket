import { NextResponse } from "next/server";
import { z } from "zod";
import { AdjustmentType, CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { hitungOngkir } from "@/lib/business/hitungOngkir";

const confirmArrivalSchema = z.object({
  resiIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 resi yang dikonfirmasi"),
  // Berat hasil timbang ulang di gudang, per resiId — opsional (kalau tidak
  // ditimbang ulang, berat & tagihan asli tetap berlaku apa adanya).
  weights: z.record(z.string(), z.number().positive()).optional(),
});

/**
 * Kepala Gudang mengecek isi karung yang dibongkar dan mengonfirmasi resi
 * mana yang BENAR-BENAR ada secara fisik — ini pengganti "Tambah Event
 * Kustodi" bebas yang dihapus. Sengaja per-resi (bukan "seluruh karung
 * otomatis") karena justru selisihnya (resi yang TIDAK dikonfirmasi di sini)
 * itulah yang dideteksi Panel Investigasi Selisih — kalau semua otomatis
 * dianggap sampai, fitur itu tidak akan pernah bisa mendeteksi apa pun.
 *
 * Bongkar muat ini juga momen timbang ulang: kalau berat aktual di gudang
 * beda dari yang tertagih saat resi dibuat, selisihnya dicatat sebagai
 * ResiAdjustment (REWEIGH_DIFF) — dihitung pakai TariffRule ASLI resi itu
 * (snapshot saat dibuat), BUKAN tarif yang sedang aktif sekarang. Ini beda
 * dari retur (yang memang perjalanan fisik baru, jadi pantas pakai tarif
 * terkini) — timbang ulang cuma mengoreksi kesalahan pada pengiriman yang
 * sama, jadi harus tetap dihitung dengan tarif yang berlaku waktu itu.
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json();
  const parsed = confirmArrivalSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const { resiIds, weights } = parsed.data;

  const sack = await prisma.sack.findUnique({ where: { id }, include: { items: true } });
  if (!sack) {
    throw new ApiError("NOT_FOUND", "Karung tidak ditemukan", 404);
  }

  const validResiIds = new Set(sack.items.map((i) => i.resiId));
  const invalid = resiIds.filter((rid) => !validResiIds.has(rid));
  if (invalid.length > 0) {
    throw new ApiError("VALIDATION_ERROR", "Ada resiId yang bukan bagian dari karung ini", 400);
  }

  const alreadyConfirmed = await prisma.packageCustodyEvent.findMany({
    where: { resiId: { in: resiIds }, eventType: CustodyEventType.MASUK_GUDANG },
    select: { resiId: true },
  });
  const alreadyConfirmedIds = new Set(alreadyConfirmed.map((e) => e.resiId));
  const toConfirm = resiIds.filter((rid) => !alreadyConfirmedIds.has(rid));

  if (toConfirm.length > 0) {
    await prisma.$transaction([
      prisma.packageCustodyEvent.createMany({
        data: toConfirm.map((resiId) => ({
          resiId,
          eventType: CustodyEventType.KELUAR_KARUNG,
          fromEntity: sack.id,
          actorUserId: session.user.id,
        })),
      }),
      prisma.packageCustodyEvent.createMany({
        data: toConfirm.map((resiId) => ({
          resiId,
          eventType: CustodyEventType.MASUK_GUDANG,
          toEntity: sack.destinationInfo,
          actorUserId: session.user.id,
        })),
      }),
    ]);
  }

  let adjustmentCount = 0;
  const reweighEntries = Object.entries(weights ?? {}).filter(([resiId]) => toConfirm.includes(resiId));
  for (const [resiId, beratAktualBaruKg] of reweighEntries) {
    const resi = await prisma.resi.findUnique({
      where: { id: resiId },
      include: { tariffRule: true },
    });
    if (!resi) continue;

    const zoneSurcharge = await prisma.zoneSurcharge.findUnique({
      where: {
        tariffRuleId_districtId: {
          tariffRuleId: resi.tariffRuleId,
          districtId: resi.destinationDistrictId,
        },
      },
    });

    const hasil = hitungOngkir({
      beratAktualKg: beratAktualBaruKg,
      dimensi: { p: Number(resi.panjangCm), l: Number(resi.lebarCm), t: Number(resi.tinggiCm) },
      tarif: {
        ratePerKg: Number(resi.tariffRule.ratePerKg),
        volumetricDivisor: Number(resi.tariffRule.volumetricDivisor),
        surchargeZona: zoneSurcharge ? Number(zoneSurcharge.surchargeAmount) : 0,
      },
    });

    const selisih = hasil.total - Number(resi.totalOngkir);

    await prisma.$transaction([
      prisma.resi.update({
        where: { id: resiId },
        data: { beratAktualKg: beratAktualBaruKg, beratTertagihKg: hasil.beratTertagihKg },
      }),
      ...(selisih !== 0
        ? [
            prisma.resiAdjustment.create({
              data: {
                resiId,
                adjustmentType: AdjustmentType.REWEIGH_DIFF,
                amount: selisih,
                reason: `Timbang ulang di gudang: ${beratAktualBaruKg}kg (semula ${Number(resi.beratTertagihKg)}kg tertagih)`,
              },
            }),
          ]
        : []),
    ]);
    if (selisih !== 0) adjustmentCount += 1;
  }

  return NextResponse.json({ sackId: sack.id, confirmedCount: toConfirm.length, adjustmentCount });
});
