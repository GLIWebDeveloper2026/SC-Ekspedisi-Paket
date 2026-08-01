import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";

const FINAL_DELIVERY_STATUSES = new Set<string>([
  CustodyEventType.TERKIRIM,
  CustodyEventType.RETUR_KE_GUDANG,
]);

/**
 * Daftar tugas hari ini untuk kurir yang login, di-scope ke session sendiri
 * (kurir tidak bisa lihat/akses tugas kurir lain sama sekali). Ada 3 jenis
 * tugas, karena ada 3 titik assignment berbeda di alur gudang/retur yang
 * semuanya menaruh kurir yang ditugaskan di kolom berbeda:
 * - deliveries: DISERAHKAN_KE_KURIR dengan toEntity = aku, belum final.
 * - sackPickups: aku ditugaskan bawa karung dari agen ke gudang
 *   (DIANGKUT_KE_GUDANG dengan actorUserId = aku), grup per karung, masih
 *   aktif selama event itu masih jadi status terakhir resi (belum MASUK_GUDANG).
 * - returnPickups: aku ditugaskan bawa retur balik ke agen asal
 *   (DIANGKUT_KEMBALI_KE_AGEN dengan actorUserId = aku), masih aktif selama
 *   belum DITERIMA_DI_AGEN_ASAL.
 */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();
  const myId = session.user.id;

  const [assignedDeliveryEvents, sackPickupEvents, returnPickupEvents] = await Promise.all([
    prisma.packageCustodyEvent.findMany({
      where: { eventType: CustodyEventType.DISERAHKAN_KE_KURIR, toEntity: myId },
      select: { resiId: true },
      distinct: ["resiId"],
    }),
    prisma.packageCustodyEvent.findMany({
      where: { eventType: CustodyEventType.DIANGKUT_KE_GUDANG, actorUserId: myId },
      select: { resiId: true },
      distinct: ["resiId"],
    }),
    prisma.packageCustodyEvent.findMany({
      where: { eventType: CustodyEventType.DIANGKUT_KEMBALI_KE_AGEN, actorUserId: myId },
      select: { resiId: true },
      distinct: ["resiId"],
    }),
  ]);

  const deliveryResiIds = assignedDeliveryEvents.map((e) => e.resiId);
  const sackPickupResiIds = sackPickupEvents.map((e) => e.resiId);
  const returnPickupResiIds = returnPickupEvents.map((e) => e.resiId);

  const allResiIds = [...new Set([...deliveryResiIds, ...sackPickupResiIds, ...returnPickupResiIds])];
  if (allResiIds.length === 0) {
    return NextResponse.json({ data: { deliveries: [], sackPickups: [], returnPickups: [] } });
  }

  const resiList = await prisma.resi.findMany({
    where: { id: { in: allResiIds } },
    include: { custodyEvents: true, sackItems: { include: { sack: true } } },
  });
  const resiById = new Map(resiList.map((r) => [r.id, r]));

  const deliveries = deliveryResiIds
    .map((id) => resiById.get(id))
    .filter((r): r is NonNullable<typeof r> => {
      if (!r) return false;
      const last = resolveLastCustody(r.custodyEvents);
      return !!last && !FINAL_DELIVERY_STATUSES.has(last.eventType);
    })
    .map((r) => ({
      id: r.id,
      noResi: r.noResi,
      recipientName: r.recipientName,
      recipientAddress: r.recipientAddress,
      serviceType: r.serviceType,
      isCod: r.isCod,
    }));

  const activeSackPickupResi = sackPickupResiIds
    .map((id) => resiById.get(id))
    .filter((r): r is NonNullable<typeof r> => {
      if (!r) return false;
      const last = resolveLastCustody(r.custodyEvents);
      return last?.eventType === CustodyEventType.DIANGKUT_KE_GUDANG;
    });
  const sackPickupsBySackId = new Map<
    string,
    { sackId: string; originInfo: string; destinationInfo: string; resiCount: number }
  >();
  for (const r of activeSackPickupResi) {
    const sack = r.sackItems[0]?.sack;
    if (!sack) continue;
    const existing = sackPickupsBySackId.get(sack.id);
    if (existing) {
      existing.resiCount += 1;
    } else {
      sackPickupsBySackId.set(sack.id, {
        sackId: sack.id,
        originInfo: sack.originInfo,
        destinationInfo: sack.destinationInfo,
        resiCount: 1,
      });
    }
  }

  const returnPickups = returnPickupResiIds
    .map((id) => resiById.get(id))
    .filter((r): r is NonNullable<typeof r> => {
      if (!r) return false;
      const last = resolveLastCustody(r.custodyEvents);
      return last?.eventType === CustodyEventType.DIANGKUT_KEMBALI_KE_AGEN;
    })
    .map((r) => ({
      id: r.id,
      noResi: r.noResi,
      recipientName: r.recipientName,
    }));

  return NextResponse.json({
    data: {
      deliveries,
      sackPickups: [...sackPickupsBySackId.values()],
      returnPickups,
    },
  });
});
