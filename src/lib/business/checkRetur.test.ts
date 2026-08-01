import { describe, it, expect } from "vitest";
import { isEligibleForReturn, shouldTriggerAutoReturn } from "./checkRetur";

describe("isEligibleForReturn", () => {
  const createdAt = new Date("2026-08-01T00:00:00Z");

  it("belum eligible di 6 hari", () => {
    const now = new Date("2026-08-07T00:00:00Z"); // +6 hari
    expect(isEligibleForReturn(createdAt, now)).toBe(false);
  });

  it("eligible tepat di boundary 7 hari", () => {
    const now = new Date("2026-08-08T00:00:00Z"); // +7 hari persis
    expect(isEligibleForReturn(createdAt, now)).toBe(true);
  });

  it("eligible di 8 hari", () => {
    const now = new Date("2026-08-09T00:00:00Z"); // +8 hari
    expect(isEligibleForReturn(createdAt, now)).toBe(true);
  });
});

describe("shouldTriggerAutoReturn", () => {
  it("tidak trigger kalau baru gagal 1x", () => {
    expect(shouldTriggerAutoReturn([], "GAGAL")).toBe(false);
  });

  it("tidak trigger kalau gagal 2x", () => {
    expect(shouldTriggerAutoReturn(["GAGAL"], "GAGAL")).toBe(false);
  });

  it("trigger setelah gagal 3x berturut-turut", () => {
    expect(shouldTriggerAutoReturn(["GAGAL", "GAGAL"], "GAGAL")).toBe(true);
  });

  it("tidak trigger kalau gagal 2x lalu berhasil", () => {
    expect(shouldTriggerAutoReturn(["GAGAL", "GAGAL"], "BERHASIL")).toBe(false);
  });

  it("hitungan reset kalau ada percobaan sukses/titip di antara kegagalan", () => {
    expect(shouldTriggerAutoReturn(["GAGAL", "DITITIP_PIHAK_KETIGA", "GAGAL"], "GAGAL")).toBe(false);
  });
});
