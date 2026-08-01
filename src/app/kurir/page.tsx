"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, ChevronRight, PackageSearch } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

interface ResiListItem {
  id: string;
  noResi: string;
  recipientName: string;
  serviceType: string;
  isCod: boolean;
}

export default function KurirResiPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["kurir-resi-options"],
    queryFn: () => apiFetch<{ data: ResiListItem[] }>("/api/resi"),
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Memuat..." : `Hari ini: ${data?.data.length ?? 0} resi`}
      </p>

      {data?.data.map((r) => (
        <Link key={r.id} href={`/kurir/lapor/${r.id}`}>
          <Card className="border-white/10 bg-white/[0.03] transition-transform active:scale-[0.98]">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
                <Package className="size-4.5 text-lampu-natrium" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm tracking-wide">{r.noResi}</p>
                  {r.isCod && (
                    <Badge className="bg-lampu-natrium/20 text-[10px] text-lampu-natrium">COD</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate text-xs">{r.recipientName}</span>
                </div>
              </div>
              <ChevronRight className="size-4.5 shrink-0 text-muted-foreground/40" />
            </CardContent>
          </Card>
        </Link>
      ))}

      {!isLoading && data?.data.length === 0 && (
        <EmptyState icon={PackageSearch} title="Tidak ada resi" description="Belum ada resi yang perlu diantar hari ini." />
      )}
    </div>
  );
}
