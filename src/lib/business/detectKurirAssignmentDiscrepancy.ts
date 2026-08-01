import type { CustodyEventLike, SackDiscrepancyItem } from "./detectSackDiscrepancy";

const FINAL_STATUSES = new Set(["TERKIRIM", "RETUR_KE_GUDANG"]);

/**
 * Leg gudang -> penerima: bandingkan resi yang DIJANJIKAN ke seorang kurir
 * (assignedResiIds, dari event DISERAHKAN_KE_KURIR) vs yang sudah TERKONFIRMASI
 * selesai (TERKIRIM atau RETUR_KE_GUDANG). Selisihnya = resi yang belum ada
 * laporan hasil dari kurir itu; pemegang terakhirnya diambil dari `toEntity`
 * event DISERAHKAN_KE_KURIR paling akhir (kurir yang ditugaskan) — BUKAN
 * `actorUserId` event itu, karena actorUserId di sini adalah Kepala Gudang yang
 * menugaskan, bukan kurir yang bertanggung jawab membawa paketnya.
 */
export function detectKurirAssignmentDiscrepancy(
  assignedResiIds: string[],
  custodyEvents: CustodyEventLike[],
): SackDiscrepancyItem[] {
  const sudahFinal = new Set(
    custodyEvents.filter((e) => FINAL_STATUSES.has(e.eventType)).map((e) => e.resiId),
  );

  const belumLapor = assignedResiIds.filter((id) => !sudahFinal.has(id));

  return belumLapor.map((resiId) => {
    const eventTerakhirDiserahkan = custodyEvents
      .filter((e) => e.resiId === resiId && e.eventType === "DISERAHKAN_KE_KURIR")
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return {
      resiId,
      pemegangTerakhir: eventTerakhirDiserahkan?.toEntity ?? "TIDAK ADA CATATAN PENUGASAN",
      waktuTerakhirTercatat: eventTerakhirDiserahkan?.timestamp ?? null,
    };
  });
}
