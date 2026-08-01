// Konstanta bisnis non-tarif. Tarif/komisi per-transaksi TIDAK boleh hardcode di sini —
// itu datang dari TariffRule/CodCollection.komisiPercent di DB. Ini hanya default & threshold proses.

export const KOMISI_DEFAULT_PERCENT = 5;
export const RETUR_DAYS_THRESHOLD = 7;
export const MAX_DELIVERY_ATTEMPTS_BEFORE_RETUR = 3;
