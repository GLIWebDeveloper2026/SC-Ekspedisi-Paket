import { describe, it, expect } from "vitest";
import { generateNoResi } from "./generateNoResi";

const PATTERN = /^KN-\d{8}-\d{4}-[A-Z0-9]{4}$/;

describe("generateNoResi", () => {
  it("membuat nomor resi pertama hari itu dengan urutan 0001 dan format lengkap", () => {
    const result = generateNoResi(new Date("2026-08-01T08:00:00"), 0);
    expect(result).toMatch(PATTERN);
    expect(result.startsWith("KN-20260801-0001-")).toBe(true);
  });

  it("increment sequence berdasarkan jumlah resi hari itu", () => {
    const result = generateNoResi(new Date("2026-08-01T08:00:00"), 9);
    expect(result.startsWith("KN-20260801-0010-")).toBe(true);
  });

  it("dua resi berurutan di hari yang sama menghasilkan suffix acak berbeda (tidak predictable)", () => {
    const a = generateNoResi(new Date("2026-08-01T08:00:00"), 0);
    const b = generateNoResi(new Date("2026-08-01T08:00:00"), 1);
    const suffixA = a.split("-")[3];
    const suffixB = b.split("-")[3];
    expect(suffixA).not.toBe(suffixB);
  });
});
