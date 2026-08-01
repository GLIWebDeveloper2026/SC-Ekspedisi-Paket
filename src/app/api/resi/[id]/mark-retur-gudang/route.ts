import { NextResponse } from "next/server";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";
import { isEligibleForReturn } from "@/lib/business/checkRetur";

/**
 * Trigger manual RETUR_KE_GUDANG — dipakai Kepala Gudang untuk paket yang
 * sudah >7 hari nginap tanpa diambil (pemicu otomatis yang sudah ada cuma
 * untuk 3x gagal antar berturut-turut, ini pelengkap untuk kasus "nginap").
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const resi = await prisma.resi.findUnique({ where: { id }, include: { custodyEvents: true } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  if (!isEligibleForReturn(resi.createdAt, new Date())) {
    throw new ApiError("VALIDATION_ERROR", "Resi ini belum >7 hari sejak dibuat", 400);
  }
  const last = resolveLastCustody(resi.custodyEvents);
  if (last?.eventType === CustodyEventType.TERKIRIM) {
    throw new ApiError("VALIDATION_ERROR", "Resi ini sudah terkirim", 400);
  }
  if (last?.eventType === CustodyEventType.RETUR_KE_GUDANG) {
    throw new ApiError("CONFLICT", "Resi ini sudah dalam proses retur", 409);
  }

  await prisma.packageCustodyEvent.create({
    data: {
      resiId: id,
      eventType: CustodyEventType.RETUR_KE_GUDANG,
      actorUserId: session.user.id,
      notes: "Manual: >7 hari tidak terkirim/diambil",
    },
  });

  return NextResponse.json({ resiId: id, status: "RETUR_KE_GUDANG" });
});
