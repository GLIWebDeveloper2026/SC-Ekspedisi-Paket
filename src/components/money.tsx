import { cn } from "@/lib/utils";

/** Angka nominal/berat/ongkir selalu pakai font mono + tabular-nums supaya rata kolom saat dibandingkan sekilas di tabel. */
export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn("font-mono tabular-nums", className)}>Rp{amount.toLocaleString("id-ID")}</span>;
}
