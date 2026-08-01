import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";

const FINAL_STATUSES = new Set<string>([CustodyEventType.TERKIRIM, CustodyEventType.RETUR_KE_GUDANG]);

/**
 * Daftar tugas hari ini untuk kurir yang login — resi yang DISERAHKAN_KE_KURIR
 * ke dia dan belum berstatus final (TERKIRIM/RETUR_KE_GUDANG). Di-scope ke
 * session sendiri — kurir tidak bisa lihat/akses resi kurir lain sama sekali.
 */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();

  const assignedEvents = await prisma.packageCustodyEvent.findMany({
    where: { eventType: CustodyEventType.DISERAHKAN_KE_KURIR, toEntity: session.user.id },
    select: { resiId: true },
    distinct: ["resiId"],
  });
  const resiIds = assignedEvents.map((e) => e.resiId);

  if (resiIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const resiList = await prisma.resi.findMany({
    where: { id: { in: resiIds } },
    include: { custodyEvents: true },
  });

  const active = resiList.filter((r) => {
    const last = resolveLastCustody(r.custodyEvents);
    return last && !FINAL_STATUSES.has(last.eventType);
  });

  return NextResponse.json({
    data: active.map((r) => ({
      id: r.id,
      noResi: r.noResi,
      recipientName: r.recipientName,
      recipientAddress: r.recipientAddress,
      serviceType: r.serviceType,
      isCod: r.isCod,
    })),
  });
});
