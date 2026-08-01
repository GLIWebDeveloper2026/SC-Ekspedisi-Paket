import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/**
 * Karung yang belum ada satu pun resi-nya dengan event DIANGKUT_KE_GUDANG —
 * dipakai Kepala Gudang untuk memutuskan karung mana yang perlu ditugaskan
 * kurir penjemput. (Sack tidak punya FK ke Warehouse di skema — daftar ini
 * sistem-lebar, bukan di-scope per gudang tertentu.)
 */
export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const sacks = await prisma.sack.findMany({
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const dispatchedResiIds = new Set(
    (
      await prisma.packageCustodyEvent.findMany({
        where: { eventType: CustodyEventType.DIANGKUT_KE_GUDANG },
        select: { resiId: true },
      })
    ).map((e) => e.resiId),
  );

  const menunggu = sacks.filter((s) => s.items.every((i) => !dispatchedResiIds.has(i.resiId)));

  return NextResponse.json({
    data: menunggu.map((s) => ({
      sackId: s.id,
      originInfo: s.originInfo,
      destinationInfo: s.destinationInfo,
      jumlahResi: s.items.length,
      dibuatSejak: s.createdAt,
    })),
  });
});
