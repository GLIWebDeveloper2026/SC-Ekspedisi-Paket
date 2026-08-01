import { NextResponse } from "next/server";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";

/**
 * Petugas Loket konfirmasi paket retur BENERAN sampai fisik di agen asal —
 * dia yang catat (bukan Kepala Gudang) karena titik serah-terima fisik ke
 * pengirim selalu di loket, sama seperti pola COD (uang selalu ketemu loket
 * dulu). Di-scope ke agennya sendiri.
 */
export const POST = withApiErrorHandling(async (_req, ctx) => {
  const session = await requireAuth([Role.PETUGAS_LOKET, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const resi = await prisma.resi.findUnique({ where: { id }, include: { custodyEvents: true } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }
  if (session.user.role === Role.PETUGAS_LOKET && resi.originAgentId !== session.user.agentId) {
    throw new ApiError("FORBIDDEN", "Resi ini bukan untuk agenmu", 403);
  }
  const last = resolveLastCustody(resi.custodyEvents);
  if (last?.eventType !== CustodyEventType.DIANGKUT_KEMBALI_KE_AGEN) {
    throw new ApiError("VALIDATION_ERROR", "Resi ini belum berstatus DIANGKUT_KEMBALI_KE_AGEN", 400);
  }

  await prisma.packageCustodyEvent.create({
    data: {
      resiId: id,
      eventType: CustodyEventType.DITERIMA_DI_AGEN_ASAL,
      toEntity: resi.originAgentId,
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json({ resiId: id, status: "DITERIMA_DI_AGEN_ASAL" });
});
