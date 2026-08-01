import { describe, it, expect } from "vitest";
import { detectKurirAssignmentDiscrepancy } from "./detectKurirAssignmentDiscrepancy";
import type { CustodyEventLike } from "./detectSackDiscrepancy";

describe("detectKurirAssignmentDiscrepancy", () => {
  it("mendeteksi resi yang ditugaskan ke kurir tapi belum ada laporan hasil (TERKIRIM/RETUR)", () => {
    const assigned = ["resi_1", "resi_2", "resi_3"];
    const events: CustodyEventLike[] = [
      {
        resiId: "resi_1",
        eventType: "DISERAHKAN_KE_KURIR",
        actorUserId: "kepala_gudang_1",
        toEntity: "kurir_07",
        timestamp: new Date("2026-08-01T07:00:00Z"),
      },
      { resiId: "resi_1", eventType: "TERKIRIM", actorUserId: null, timestamp: new Date() },
      {
        resiId: "resi_2",
        eventType: "DISERAHKAN_KE_KURIR",
        actorUserId: "kepala_gudang_1",
        toEntity: "kurir_07",
        timestamp: new Date("2026-08-01T07:00:00Z"),
      },
      // resi_2: belum ada event final sama sekali
      {
        resiId: "resi_3",
        eventType: "DISERAHKAN_KE_KURIR",
        actorUserId: "kepala_gudang_1",
        toEntity: "kurir_09",
        timestamp: new Date("2026-08-01T07:00:00Z"),
      },
      { resiId: "resi_3", eventType: "RETUR_KE_GUDANG", actorUserId: null, timestamp: new Date() },
    ];

    const hasil = detectKurirAssignmentDiscrepancy(assigned, events);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].resiId).toBe("resi_2");
    expect(hasil[0].pemegangTerakhir).toBe("kurir_07");
  });

  it("fallback ke TIDAK ADA CATATAN PENUGASAN kalau tidak pernah ada event DISERAHKAN_KE_KURIR", () => {
    const hasil = detectKurirAssignmentDiscrepancy(["resi_x"], []);
    expect(hasil[0].pemegangTerakhir).toBe("TIDAK ADA CATATAN PENUGASAN");
  });

  it("tidak ada selisih kalau semua sudah TERKIRIM atau RETUR_KE_GUDANG", () => {
    const hasil = detectKurirAssignmentDiscrepancy(
      ["resi_a"],
      [{ resiId: "resi_a", eventType: "TERKIRIM", actorUserId: null, timestamp: new Date() }],
    );
    expect(hasil).toEqual([]);
  });
});
