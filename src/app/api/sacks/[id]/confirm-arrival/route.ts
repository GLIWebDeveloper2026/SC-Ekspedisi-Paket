import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const confirmArrivalSchema = z.object({
  resiIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 resi yang dikonfirmasi"),
});

/**
 * Kepala Gudang mengecek isi karung yang dibongkar dan mengonfirmasi resi
 * mana yang BENAR-BENAR ada secara fisik — ini pengganti "Tambah Event
 * Kustodi" bebas yang dihapus. Sengaja per-resi (bukan "seluruh karung
 * otomatis") karena justru selisihnya (resi yang TIDAK dikonfirmasi di sini)
 * itulah yang dideteksi Panel Investigasi Selisih — kalau semua otomatis
 * dianggap sampai, fitur itu tidak akan pernah bisa mendeteksi apa pun.
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json();
  const parsed = confirmArrivalSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const { resiIds } = parsed.data;

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

  return NextResponse.json({ sackId: sack.id, confirmedCount: toConfirm.length });
});
