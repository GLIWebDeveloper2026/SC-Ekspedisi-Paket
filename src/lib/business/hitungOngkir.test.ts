import { describe, it, expect } from "vitest";
import { hitungOngkir } from "./hitungOngkir";

describe("hitungOngkir", () => {
  it("memakai berat volumetrik jika lebih besar dari berat aktual (Kejadian A)", () => {
    const hasil = hitungOngkir({
      beratAktualKg: 1.2,
      dimensi: { p: 60, l: 40, t: 40 },
      tarif: { ratePerKg: 12000, volumetricDivisor: 6000, surchargeZona: 0 },
    });
    expect(hasil.beratTertagihKg).toBe(16);
    expect(hasil.total).toBe(192000);
  });

  it("memakai berat aktual jika lebih besar dari berat volumetrik", () => {
    const hasil = hitungOngkir({
      beratAktualKg: 10,
      dimensi: { p: 20, l: 20, t: 20 },
      tarif: { ratePerKg: 10000, volumetricDivisor: 6000, surchargeZona: 0 },
    });
    // volumetrik = (20*20*20)/6000 = 1.333..., aktual 10 lebih besar
    expect(hasil.beratTertagihKg).toBe(10);
    expect(hasil.total).toBe(100000);
  });

  it("menambahkan surcharge zona jauh ke total", () => {
    const hasil = hitungOngkir({
      beratAktualKg: 2,
      dimensi: { p: 10, l: 10, t: 10 },
      tarif: { ratePerKg: 10000, volumetricDivisor: 6000, surchargeZona: 15000 },
    });
    expect(hasil.biayaDasar).toBe(20000);
    expect(hasil.biayaZona).toBe(15000);
    expect(hasil.total).toBe(35000);
  });

  it("tidak menambahkan surcharge kalau tidak ada surcharge zona", () => {
    const hasil = hitungOngkir({
      beratAktualKg: 2,
      dimensi: { p: 10, l: 10, t: 10 },
      tarif: { ratePerKg: 10000, volumetricDivisor: 6000 },
    });
    expect(hasil.biayaZona).toBe(0);
    expect(hasil.total).toBe(20000);
  });

  it("melempar error kalau berat aktual <= 0", () => {
    expect(() =>
      hitungOngkir({
        beratAktualKg: 0,
        dimensi: { p: 10, l: 10, t: 10 },
        tarif: { ratePerKg: 10000, volumetricDivisor: 6000 },
      }),
    ).toThrowError();
  });
});
