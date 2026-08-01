/** Format: KN-YYYYMMDD-XXXX. `sequenceToday` = jumlah resi yang sudah dibuat hari ini SEBELUM resi ini. */
export function generateNoResi(date: Date, sequenceToday: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const seq = String(sequenceToday + 1).padStart(4, "0");
  return `KN-${yyyy}${mm}${dd}-${seq}`;
}
