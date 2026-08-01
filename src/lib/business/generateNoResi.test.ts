import { describe, it, expect } from "vitest";
import { generateNoResi } from "./generateNoResi";

describe("generateNoResi", () => {
  it("membuat nomor resi pertama hari itu sebagai 0001", () => {
    expect(generateNoResi(new Date("2026-08-01T08:00:00"), 0)).toBe("KN-20260801-0001");
  });

  it("increment sequence berdasarkan jumlah resi hari itu", () => {
    expect(generateNoResi(new Date("2026-08-01T08:00:00"), 9)).toBe("KN-20260801-0010");
  });
});
