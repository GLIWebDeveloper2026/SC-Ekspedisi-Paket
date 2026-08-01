import { Skeleton } from "@/components/ui/skeleton";

/** Niru bentuk baris tabel — dipakai saat data list masih dimuat. */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b py-3 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 w-24" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  );
}
