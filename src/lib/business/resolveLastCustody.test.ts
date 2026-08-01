import { describe, it, expect } from "vitest";
import { resolveLastCustody, type CustodyEventLike } from "./resolveLastCustody";

describe("resolveLastCustody", () => {
  it("event tunggal dikembalikan apa adanya", () => {
    const events: CustodyEventLike[] = [
      { eventType: "DIBUAT_DI_LOKET", toEntity: "agent_1", timestamp: new Date("2026-08-01T08:00:00Z") },
    ];
    expect(resolveLastCustody(events)?.eventType).toBe("DIBUAT_DI_LOKET");
  });

  it("mengambil event dengan timestamp terbesar walau input tidak berurutan waktu", () => {
    const events: CustodyEventLike[] = [
      { eventType: "MASUK_GUDANG", toEntity: "warehouse_1", timestamp: new Date("2026-08-01T11:00:00Z") },
      { eventType: "DIBUAT_DI_LOKET", toEntity: "agent_1", timestamp: new Date("2026-08-01T08:00:00Z") },
      { eventType: "MASUK_KARUNG", toEntity: "sack_45", timestamp: new Date("2026-08-01T09:00:00Z") },
    ];
    const hasil = resolveLastCustody(events);
    expect(hasil?.eventType).toBe("MASUK_GUDANG");
  });

  it("mengembalikan null (bukan crash) kalau tidak ada event", () => {
    expect(resolveLastCustody([])).toBeNull();
  });
});
