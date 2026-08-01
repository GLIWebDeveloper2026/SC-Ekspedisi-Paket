import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { detectSackDiscrepancy } from "@/lib/business/detectSackDiscrepancy";
import { resolveUserNames } from "@/lib/resolve-user-names";

export const GET = withApiErrorHandling(async (_req, ctx) => {
  await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const sack = await prisma.sack.findUnique({
    where: { id },
    include: { items: { include: { resi: { select: { noResi: true } } } } },
  });
  if (!sack) {
    throw new ApiError("NOT_FOUND", "Karung tidak ditemukan", 404);
  }

  const resiIds = sack.items.map((i) => i.resiId);
  const events = await prisma.packageCustodyEvent.findMany({
    where: {
      resiId: { in: resiIds },
      eventType: { in: [CustodyEventType.MASUK_GUDANG, CustodyEventType.DIANGKUT_KE_GUDANG] },
    },
  });

  const paketHilang = detectSackDiscrepancy(resiIds, events);
  const noResiByResiId = new Map(sack.items.map((i) => [i.resiId, i.resi.noResi]));
  const nameByUserId = await resolveUserNames(paketHilang.map((p) => p.pemegangTerakhir));

  return NextResponse.json({
    sackId: sack.id,
    totalDijanjikan: resiIds.length,
    totalTercatatMasuk: resiIds.length - paketHilang.length,
    paketHilang: paketHilang.map((p) => ({
      ...p,
      noResi: noResiByResiId.get(p.resiId) ?? null,
      pemegangTerakhir: nameByUserId.get(p.pemegangTerakhir) ?? p.pemegangTerakhir,
    })),
  });
});
