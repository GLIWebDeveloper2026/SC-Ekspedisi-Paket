import { NextResponse } from "next/server";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";

/**
 * Antrian retur, 3 tahap (mirroring alur maju, dibalik arahnya):
 * 1. awaitingDispatch — RETUR_KE_GUDANG, Kepala Gudang perlu assign kurir
 *    bawa balik ke agen asal.
 * 2. awaitingArrivalConfirmation — DIANGKUT_KEMBALI_KE_AGEN, Petugas Loket
 *    perlu konfirmasi fisiknya beneran sampai (di-scope ke agennya sendiri).
 * 3. awaitingFinalProcessing — DITERIMA_DI_AGEN_ASAL, siap diproses Petugas
 *    Loket (hitung & tagih ongkir balik, serah-terima ke pengirim).
 */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();

  if (session.user.role === Role.PETUGAS_LOKET && !session.user.agentId) {
    throw new ApiError("FORBIDDEN", "Akun ini tidak terdaftar di agen mana pun", 403);
  }

  const candidates = await prisma.resi.findMany({
    where: {
      returns: { none: {} },
      ...(session.user.role === Role.PETUGAS_LOKET ? { originAgentId: session.user.agentId! } : {}),
    },
    include: { custodyEvents: true, originAgent: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const toItem = (r: (typeof candidates)[number]) => ({
    resiId: r.id,
    noResi: r.noResi,
    senderName: r.senderName,
    recipientName: r.recipientName,
    originAgent: r.originAgent,
  });

  const byStage = (eventType: CustodyEventType) =>
    candidates
      .filter((r) => resolveLastCustody(r.custodyEvents)?.eventType === eventType)
      .map(toItem);

  return NextResponse.json({
    awaitingDispatch: byStage(CustodyEventType.RETUR_KE_GUDANG),
    awaitingArrivalConfirmation: byStage(CustodyEventType.DIANGKUT_KEMBALI_KE_AGEN),
    awaitingFinalProcessing: byStage(CustodyEventType.DITERIMA_DI_AGEN_ASAL),
  });
});
