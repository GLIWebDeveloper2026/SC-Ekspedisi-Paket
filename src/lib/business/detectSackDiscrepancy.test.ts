import { describe, it, expect } from "vitest";
import { detectSackDiscrepancy, type CustodyEventLike } from "./detectSackDiscrepancy";

describe("detectSackDiscrepancy", () => {
  it("mendeteksi 1 paket hilang dari 50 dan menunjuk pengangkut terakhir (Kejadian D)", () => {
    const sackItems = Array.from({ length: 50 }, (_, i) => `resi_${i + 1}`);
    const events: CustodyEventLike[] = sackItems
      .slice(0, 49)
      .map((id): CustodyEventLike => ({
        resiId: id,
        eventType: "MASUK_GUDANG",
        actorUserId: null,
        timestamp: new Date(),
      }))
      .concat(
        sackItems.map((id): CustodyEventLike => ({
          resiId: id,
          eventType: "DIANGKUT_KE_GUDANG",
          actorUserId: "kurir_03",
          timestamp: new Date("2026-08-01T09:00:00Z"),
        })),
      );

    const hasil = detectSackDiscrepancy(sackItems, events);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].resiId).toBe("resi_50");
    expect(hasil[0].pemegangTerakhir).toBe("kurir_03");
  });

  it("fallback ke TIDAK ADA CATATAN PENGANGKUT kalau tidak pernah ada event DIANGKUT_KE_GUDANG", () => {
    const hasil = detectSackDiscrepancy(["resi_x"], []);
    expect(hasil).toEqual([
      { resiId: "resi_x", pemegangTerakhir: "TIDAK ADA CATATAN PENGANGKUT", waktuTerakhirTercatat: null },
    ]);
  });

  it("tidak ada selisih kalau semua resi sudah MASUK_GUDANG", () => {
    const hasil = detectSackDiscrepancy(
      ["resi_a", "resi_b"],
      [
        { resiId: "resi_a", eventType: "MASUK_GUDANG", actorUserId: null, timestamp: new Date() },
        { resiId: "resi_b", eventType: "MASUK_GUDANG", actorUserId: null, timestamp: new Date() },
      ],
    );
    expect(hasil).toEqual([]);
  });

  it("pengangkut terakhir diambil dari event DIANGKUT_KE_GUDANG paling baru kalau ada beberapa", () => {
    const hasil = detectSackDiscrepancy(
      ["resi_z"],
      [
        {
          resiId: "resi_z",
          eventType: "DIANGKUT_KE_GUDANG",
          actorUserId: "kurir_lama",
          timestamp: new Date("2026-08-01T08:00:00Z"),
        },
        {
          resiId: "resi_z",
          eventType: "DIANGKUT_KE_GUDANG",
          actorUserId: "kurir_baru",
          timestamp: new Date("2026-08-01T10:00:00Z"),
        },
      ],
    );
    expect(hasil[0].pemegangTerakhir).toBe("kurir_baru");
  });
});
