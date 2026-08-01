import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, ReturnBorneBy, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveOngkirForResi } from "@/lib/resolve-ongkir";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";

const createReturnSchema = z.object({
  resiId: z.string().min(1),
  reason: z.string().min(1),
  borneBy: z.enum(ReturnBorneBy).default(ReturnBorneBy.PENGIRIM),
});

/**
 * Ongkir balik DIHITUNG OTOMATIS pakai TariffRule yang aktif HARI INI, bukan
 * di-input manual dan bukan pakai snapshot tarif resi asli — perjalanan balik
 * adalah kejadian fisik baru (barang digerakkan lagi hari ini), konsisten
 * dengan prinsip tariff versioning: kita tidak pernah pakai tarif lama untuk
 * pengiriman baru. Berat/dimensi tetap dari resi asli (barang sama, tidak
 * perlu ditimbang ulang). "Tujuan" perjalanan balik = kecamatan agen asal
 * (barang balik ke sana untuk diserahkan ke pengirim).
 */
export const POST = withApiErrorHandling(async (req) => {
  // Cuma Petugas Loket (dan Owner) — dia yang pegang uang & ketemu langsung
  // sama pengirim, sama seperti pola COD. Kepala Gudang berhenti di titik
  // DITERIMA_DI_AGEN_ASAL, tidak ikut proses uang/serah-terima final.
  const session = await requireAuth([Role.PETUGAS_LOKET, Role.OWNER]);

  const body = await req.json();
  const parsed = createReturnSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const resi = await prisma.resi.findUnique({
    where: { id: input.resiId },
    include: { originAgent: { select: { districtId: true } }, custodyEvents: true },
  });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  // Petugas Loket cuma boleh proses retur untuk resi yang balik ke agennya sendiri.
  if (session.user.role === Role.PETUGAS_LOKET && resi.originAgentId !== session.user.agentId) {
    throw new ApiError("FORBIDDEN", "Resi ini bukan untuk agenmu", 403);
  }

  const last = resolveLastCustody(resi.custodyEvents);
  if (last?.eventType !== CustodyEventType.DITERIMA_DI_AGEN_ASAL) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Resi ini belum dikonfirmasi sampai fisik di agen asal (DITERIMA_DI_AGEN_ASAL)",
      400,
    );
  }

  const { hasil } = await resolveOngkirForResi({
    serviceType: resi.serviceType,
    destinationDistrictId: resi.originAgent.districtId,
    beratAktualKg: Number(resi.beratAktualKg),
    panjangCm: Number(resi.panjangCm),
    lebarCm: Number(resi.lebarCm),
    tinggiCm: Number(resi.tinggiCm),
  });

  const result = await prisma.$transaction(async (tx) => {
    const ret = await tx.return.create({
      data: {
        resiId: input.resiId,
        reason: input.reason,
        returnShippingCost: hasil.total,
        borneBy: input.borneBy,
      },
    });

    await tx.packageCustodyEvent.create({
      data: {
        resiId: input.resiId,
        eventType: CustodyEventType.RETUR_KE_PENGIRIM,
        actorUserId: session.user.id,
        notes: input.reason,
      },
    });

    return ret;
  });

  return NextResponse.json(
    {
      id: result.id,
      resiId: result.resiId,
      reason: result.reason,
      returnShippingCost: Number(result.returnShippingCost),
      borneBy: result.borneBy,
      initiatedAt: result.initiatedAt,
    },
    { status: 201 },
  );
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const returns = await prisma.return.findMany({
    include: { resi: { select: { noResi: true } } },
    orderBy: { initiatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: returns.map((r) => ({
      id: r.id,
      resiId: r.resiId,
      noResi: r.resi.noResi,
      reason: r.reason,
      returnShippingCost: Number(r.returnShippingCost),
      borneBy: r.borneBy,
      initiatedAt: r.initiatedAt,
    })),
  });
});
