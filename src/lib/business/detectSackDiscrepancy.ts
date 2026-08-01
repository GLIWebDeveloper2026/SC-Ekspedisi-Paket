export interface CustodyEventLike {
  resiId: string;
  eventType: string;
  actorUserId: string | null;
  toEntity?: string | null;
  timestamp: Date;
}

export interface SackDiscrepancyItem {
  resiId: string;
  pemegangTerakhir: string;
  waktuTerakhirTercatat: Date | null;
}

/**
 * Leg agen -> gudang: bandingkan resi yang DIJANJIKAN masuk karung (sackItemResiIds)
 * vs yang TERKONFIRMASI event MASUK_GUDANG. Selisihnya = paket hilang di tengah jalan;
 * pemegang terakhirnya diambil dari event DIANGKUT_KE_GUDANG paling akhir milik resi itu.
 */
export function detectSackDiscrepancy(
  sackItemResiIds: string[],
  custodyEvents: CustodyEventLike[],
): SackDiscrepancyItem[] {
  const sudahMasukGudang = new Set(
    custodyEvents.filter((e) => e.eventType === "MASUK_GUDANG").map((e) => e.resiId),
  );

  const hilang = sackItemResiIds.filter((id) => !sudahMasukGudang.has(id));

  return hilang.map((resiId) => {
    const eventTerakhirDiangkut = custodyEvents
      .filter((e) => e.resiId === resiId && e.eventType === "DIANGKUT_KE_GUDANG")
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return {
      resiId,
      pemegangTerakhir: eventTerakhirDiangkut?.actorUserId ?? "TIDAK ADA CATATAN PENGANGKUT",
      waktuTerakhirTercatat: eventTerakhirDiangkut?.timestamp ?? null,
    };
  });
}
