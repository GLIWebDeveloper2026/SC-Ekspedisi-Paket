import { describe, it, expect } from "vitest";
import { hitungSetoranCod, hitungDiscrepancyRemit } from "./hitungSetoranCod";

describe("hitungSetoranCod", () => {
  it("menghitung setoran wajib normal: nilaiCod - ongkir - komisi", () => {
    // nilaiCod 350.000, ongkir 30.000, komisi 1.5% dari nilaiCod (5.250) => 314.750
    const hasil = hitungSetoranCod({ nilaiCod: 350000, ongkir: 30000, komisiPercent: 1.5 });
    expect(hasil.komisiAmount).toBe(5250);
    expect(hasil.expectedRemit).toBe(314750);
  });

  it("komisi 0% berarti setoran wajib = nilaiCod - ongkir", () => {
    const hasil = hitungSetoranCod({ nilaiCod: 100000, ongkir: 20000, komisiPercent: 0 });
    expect(hasil.komisiAmount).toBe(0);
    expect(hasil.expectedRemit).toBe(80000);
  });

  it("pakai KOMISI_DEFAULT_PERCENT kalau komisiPercent tidak diisi", () => {
    const hasil = hitungSetoranCod({ nilaiCod: 100000, ongkir: 0 });
    expect(hasil.komisiAmount).toBeGreaterThan(0);
  });

  it("nilai COD lebih kecil dari ongkir+komisi tetap di-clamp ke 0, tidak minus", () => {
    const hasil = hitungSetoranCod({ nilaiCod: 5000, ongkir: 20000, komisiPercent: 5 });
    expect(hasil.expectedRemit).toBe(0);
    expect(hasil.expectedRemit).not.toBeLessThan(0);
  });
});

describe("hitungDiscrepancyRemit", () => {
  it("status REMITTED kalau setoran aktual sama dengan setoran wajib", () => {
    const hasil = hitungDiscrepancyRemit({ expectedRemit: 314500, remitAmount: 314500 });
    expect(hasil.discrepancyAmount).toBe(0);
    expect(hasil.remitStatus).toBe("REMITTED");
  });

  it("status DISCREPANCY kalau setoran aktual kurang dari setoran wajib", () => {
    const hasil = hitungDiscrepancyRemit({ expectedRemit: 314500, remitAmount: 310000 });
    expect(hasil.discrepancyAmount).toBe(4500);
    expect(hasil.remitStatus).toBe("DISCREPANCY");
  });
});
