"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Tampilkan</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>baris</span>
      </div>

      <span className="text-xs text-muted-foreground">
        {start}–{end} dari {totalItems}
      </span>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2 text-xs text-muted-foreground">
          Hal {page} / {totalPages}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
