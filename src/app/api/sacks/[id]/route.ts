import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/** Detail 1 karung + status tiap resi di dalamnya — dipakai panel "Konfirmasi Masuk Gudang". */
export const GET = withApiErrorHandling(async (_req, ctx) => {
  await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const sack = await prisma.sack.findUnique({
    where: { id },
    include: { items: { include: { resi: { select: { id: true, noResi: true } } } } },
  });
  if (!sack) {
    throw new ApiError("NOT_FOUND", "Karung tidak ditemukan", 404);
  }

  const resiIds = sack.items.map((i) => i.resiId);
  const events = await prisma.packageCustodyEvent.findMany({
    where: {
      resiId: { in: resiIds },
      eventType: { in: [CustodyEventType.DIANGKUT_KE_GUDANG, CustodyEventType.MASUK_GUDANG] },
    },
    select: { resiId: true, eventType: true },
  });
  const dispatchedIds = new Set(
    events.filter((e) => e.eventType === CustodyEventType.DIANGKUT_KE_GUDANG).map((e) => e.resiId),
  );
  const arrivedIds = new Set(
    events.filter((e) => e.eventType === CustodyEventType.MASUK_GUDANG).map((e) => e.resiId),
  );

  return NextResponse.json({
    id: sack.id,
    originInfo: sack.originInfo,
    destinationInfo: sack.destinationInfo,
    isDispatched: dispatchedIds.size > 0,
    items: sack.items.map((i) => ({
      resiId: i.resiId,
      noResi: i.resi.noResi,
      arrived: arrivedIds.has(i.resiId),
    })),
  });
});
