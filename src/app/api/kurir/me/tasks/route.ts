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
 * tugas, karena ada 3 titik assignment berbeda di alur gudang/retur:
 * - sackPickups: karung yang DITUNJUK ke aku lewat /api/sacks/:id/assign-pickup
 *   tapi belum aku konfirmasi ambil (belum ada event DIANGKUT_KE_GUDANG sama
 *   sekali untuk resi di dalamnya) — ini yang butuh AKSI dariku.
 * - deliveries: DISERAHKAN_KE_KURIR dengan toEntity = aku, belum final —
 *   butuh AKSI lapor hasil antar.
 * - returnPickups: aku ditugaskan bawa retur balik ke agen asal
 *   (DIANGKUT_KEMBALI_KE_AGEN dengan actorUserId = aku), sudah tercatat
 *   otomatis saat Kepala Gudang menugaskan (serah terima terjadi di tempat
 *   yang sama, di gudang) — jadi ini cuma informasi, tidak butuh aksi lagi.
 */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();
  const myId = session.user.id;

  const [assignedSacks, assignedDeliveryEvents, returnPickupEvents] = await Promise.all([
    prisma.sack.findMany({
      where: { assignedPickupCourierId: myId },
      include: {
        items: { include: { resi: { select: { recipientName: true, recipientAddress: true } } } },
      },
    }),
    prisma.packageCustodyEvent.findMany({
      where: { eventType: CustodyEventType.DISERAHKAN_KE_KURIR, toEntity: myId },
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
  const returnPickupResiIds = returnPickupEvents.map((e) => e.resiId);
  const allResiIds = [...new Set([...deliveryResiIds, ...returnPickupResiIds])];

  const resiList = allResiIds.length
    ? await prisma.resi.findMany({
        where: { id: { in: allResiIds } },
        include: { custodyEvents: true },
      })
    : [];
  const resiById = new Map(resiList.map((r) => [r.id, r]));

  // Karung yang ditunjuk ke aku tapi belum satupun resinya diangkut —
  // masih pending konfirmasi ambil.
  const allSackResiIds = assignedSacks.flatMap((s) => s.items.map((i) => i.resiId));
  const alreadyDispatchedIds = allSackResiIds.length
    ? new Set(
        (
          await prisma.packageCustodyEvent.findMany({
            where: { resiId: { in: allSackResiIds }, eventType: CustodyEventType.DIANGKUT_KE_GUDANG },
            select: { resiId: true },
          })
        ).map((e) => e.resiId),
      )
    : new Set<string>();

  const sackPickups = assignedSacks
    .filter((s) => s.items.every((i) => !alreadyDispatchedIds.has(i.resiId)))
    .map((s) => ({
      sackId: s.id,
      originInfo: s.originInfo,
      destinationInfo: s.destinationInfo,
      items: s.items.map((i) => ({
        resiId: i.resiId,
        recipientName: i.resi.recipientName,
        recipientAddress: i.resi.recipientAddress,
      })),
    }));

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
      recipientAddress: r.recipientAddress,
    }));

  return NextResponse.json({ data: { sackPickups, deliveries, returnPickups } });
});
