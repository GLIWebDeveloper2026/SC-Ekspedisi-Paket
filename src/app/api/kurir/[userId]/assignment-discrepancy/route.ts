import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { detectKurirAssignmentDiscrepancy } from "@/lib/business/detectKurirAssignmentDiscrepancy";
import { resolveUserNames } from "@/lib/resolve-user-names";

/**
 * Pola sama persis dengan GET /api/sacks/:id/discrepancy, tapi untuk leg
 * gudang -> penerima: bandingkan resi yang di-assign ke kurir ini
 * (DISERAHKAN_KE_KURIR toEntity=userId) vs yang sudah punya status final
 * (TERKIRIM / RETUR_KE_GUDANG).
 */
export const GET = withApiErrorHandling(async (_req, ctx) => {
  await requireAuth();
  const { userId } = await (ctx as { params: Promise<{ userId: string }> }).params;

  const kurir = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!kurir) {
    throw new ApiError("NOT_FOUND", "Kurir tidak ditemukan", 404);
  }

  const assignedEvents = await prisma.packageCustodyEvent.findMany({
    where: { eventType: CustodyEventType.DISERAHKAN_KE_KURIR, toEntity: userId },
    select: { resiId: true },
    distinct: ["resiId"],
  });
  const assignedResiIds = assignedEvents.map((e) => e.resiId);

  if (assignedResiIds.length === 0) {
    return NextResponse.json({ kurirId: userId, kurirName: kurir.name, totalDitugaskan: 0, belumSelesai: [] });
  }

  const events = await prisma.packageCustodyEvent.findMany({
    where: {
      resiId: { in: assignedResiIds },
      eventType: {
        in: [
          CustodyEventType.DISERAHKAN_KE_KURIR,
          CustodyEventType.TERKIRIM,
          CustodyEventType.RETUR_KE_GUDANG,
        ],
      },
    },
  });

  const belumSelesai = detectKurirAssignmentDiscrepancy(assignedResiIds, events);
  const resiList = await prisma.resi.findMany({
    where: { id: { in: belumSelesai.map((b) => b.resiId) } },
    select: { id: true, noResi: true },
  });
  const noResiByResiId = new Map(resiList.map((r) => [r.id, r.noResi]));
  const nameByUserId = await resolveUserNames(belumSelesai.map((b) => b.pemegangTerakhir));

  return NextResponse.json({
    kurirId: userId,
    kurirName: kurir.name,
    totalDitugaskan: assignedResiIds.length,
    belumSelesai: belumSelesai.map((b) => ({
      ...b,
      noResi: noResiByResiId.get(b.resiId) ?? null,
      pemegangTerakhir: nameByUserId.get(b.pemegangTerakhir) ?? b.pemegangTerakhir,
    })),
  });
});
