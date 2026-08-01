import { customAlphabet } from "nanoid";

// Hindari karakter ambigu (0/O, 1/I) supaya nomor gampang dibaca manusia.
const randomSuffix = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

/**
 * Format: KN-YYYYMMDD-XXXX-SUFF. `sequenceToday` = jumlah resi yang sudah
 * dibuat hari ini SEBELUM resi ini. Segmen acak (SUFF) di akhir sengaja
 * ditambahkan supaya nomor resi tidak predictable/enumerable — resi lain
 * tidak bisa ditebak cuma dari urutan tanggal+angka (perlu untuk pelacakan
 * publik, lihat docs/14-PELACAKAN-PUBLIK.md).
 */
export function generateNoResi(date: Date, sequenceToday: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const seq = String(sequenceToday + 1).padStart(4, "0");
  return `KN-${yyyy}${mm}${dd}-${seq}-${randomSuffix()}`;
}
