/** Cocokkan query pencarian (case-insensitive) terhadap beberapa field sekaligus. */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}
