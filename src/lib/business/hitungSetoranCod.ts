import { KOMISI_DEFAULT_PERCENT } from "./config";

export interface HitungSetoranCodInput {
  nilaiCod: number;
  ongkir: number;
  komisiPercent?: number;
}

export interface HitungSetoranCodResult {
  komisiAmount: number;
  expectedRemit: number;
}

/**
 * Setoran wajib kurir = nilai COD − ongkir − komisi (FR-4).
 * Kalau nilai COD lebih kecil dari ongkir+komisi, expectedRemit di-clamp ke 0
 * (kurir tidak pernah "berhutang negatif" dari formula ini — kasus itu, kalau ada,
 * jadi urusan penagihan terpisah, bukan angka minus di setoran wajib).
 */
export function hitungSetoranCod(input: HitungSetoranCodInput): HitungSetoranCodResult {
  const { nilaiCod, ongkir, komisiPercent = KOMISI_DEFAULT_PERCENT } = input;

  if (nilaiCod < 0 || ongkir < 0) {
    throw new Error("Nilai COD dan ongkir tidak boleh negatif");
  }

  const komisiAmount = nilaiCod * (komisiPercent / 100);
  const expectedRemitRaw = nilaiCod - ongkir - komisiAmount;
  const expectedRemit = Math.max(0, expectedRemitRaw);

  return { komisiAmount, expectedRemit };
}

export interface HitungDiscrepancyRemitInput {
  expectedRemit: number;
  remitAmount: number;
}

export interface HitungDiscrepancyRemitResult {
  discrepancyAmount: number;
  remitStatus: "REMITTED" | "DISCREPANCY";
}

/** Dipakai saat kurir benar-benar setor uang, membandingkan setoran wajib vs aktual. */
export function hitungDiscrepancyRemit(
  input: HitungDiscrepancyRemitInput,
): HitungDiscrepancyRemitResult {
  const { expectedRemit, remitAmount } = input;
  const discrepancyAmount = expectedRemit - remitAmount;
  const remitStatus = discrepancyAmount === 0 ? "REMITTED" : "DISCREPANCY";
  return { discrepancyAmount, remitStatus };
}
