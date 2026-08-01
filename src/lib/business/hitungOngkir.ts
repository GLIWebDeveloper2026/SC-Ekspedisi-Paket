export interface Dimensi {
  p: number;
  l: number;
  t: number;
}

export interface TarifInput {
  ratePerKg: number;
  volumetricDivisor: number;
  surchargeZona?: number;
}

export interface HitungOngkirInput {
  beratAktualKg: number;
  dimensi: Dimensi;
  tarif: TarifInput;
}

export interface HitungOngkirResult {
  beratVolumetrikKg: number;
  beratTertagihKg: number;
  biayaDasar: number;
  biayaZona: number;
  total: number;
}

/**
 * Pure function — tidak menyentuh Prisma/DB. Tarif SELALU datang dari parameter
 * (snapshot TariffRule aktif), tidak pernah hardcoded di sini.
 */
export function hitungOngkir(input: HitungOngkirInput): HitungOngkirResult {
  const { beratAktualKg, dimensi, tarif } = input;

  if (beratAktualKg <= 0) {
    throw new Error("Berat harus lebih dari 0");
  }
  if (dimensi.p <= 0 || dimensi.l <= 0 || dimensi.t <= 0) {
    throw new Error("Dimensi paket harus lebih dari 0");
  }
  if (tarif.volumetricDivisor <= 0) {
    throw new Error("Volumetric divisor tarif harus lebih dari 0");
  }

  const beratVolumetrikKg = (dimensi.p * dimensi.l * dimensi.t) / tarif.volumetricDivisor;
  const beratTertagihKg = Math.max(beratAktualKg, beratVolumetrikKg);
  const biayaDasar = beratTertagihKg * tarif.ratePerKg;
  const biayaZona = tarif.surchargeZona ?? 0;
  const total = biayaDasar + biayaZona;

  return { beratVolumetrikKg, beratTertagihKg, biayaDasar, biayaZona, total };
}
