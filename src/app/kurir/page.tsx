"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package,
  MapPin,
  ChevronRight,
  ChevronDown,
  PackageSearch,
  Truck,
  Undo2,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { cn } from "@/lib/utils";

interface DeliveryTask {
  id: string;
  noResi: string;
  recipientName: string;
  recipientAddress: string;
  serviceType: string;
  isCod: boolean;
}

interface SackPickupTask {
  sackId: string;
  originInfo: string;
  destinationInfo: string;
  items: { resiId: string; recipientName: string; recipientAddress: string }[];
}

interface ReturnPickupTask {
  id: string;
  noResi: string;
  recipientName: string;
  recipientAddress: string;
}

interface TasksResponse {
  sackPickups: SackPickupTask[];
  deliveries: DeliveryTask[];
  returnPickups: ReturnPickupTask[];
}

export default function KurirResiPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["kurir-my-tasks"],
    queryFn: () => apiFetch<{ data: TasksResponse }>("/api/kurir/me/tasks"),
  });

  const [search, setSearch] = useState("");
  const [expandedSackId, setExpandedSackId] = useState<string | null>(null);

  const sackPickups = data?.data.sackPickups ?? [];
  const deliveries = data?.data.deliveries ?? [];
  const returnPickups = data?.data.returnPickups ?? [];
  const totalTasks = sackPickups.length + deliveries.length + returnPickups.length;

  const filteredDeliveries = useMemo(
    () => deliveries.filter((r) => matchesSearch(search, r.noResi, r.recipientName)),
    [deliveries, search],
  );

  const confirmPickupMutation = useMutation({
    mutationFn: (sackId: string) => apiFetch(`/api/sacks/${sackId}/dispatch`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Karung dikonfirmasi diambil, menuju gudang");
      queryClient.invalidateQueries({ queryKey: ["kurir-my-tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Memuat..." : `Tugas hari ini: ${totalTasks} item`}
      </p>

      {sackPickups.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jemput Karung ke Gudang
          </p>
          {sackPickups.map((s) => {
            const expanded = expandedSackId === s.sackId;
            return (
              <Card key={s.sackId} className="border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-3 px-4 text-left"
                  onClick={() => setExpandedSackId(expanded ? null : s.sackId)}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
                    <Truck className="size-4.5 text-lampu-natrium" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {s.originInfo} <span className="text-muted-foreground">&rarr;</span> {s.destinationInfo}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.items.length} resi dalam karung ini</p>
                  </div>
                  <ChevronDown className={cn("size-4.5 shrink-0 text-muted-foreground/40 transition-transform", expanded && "rotate-180")} />
                </button>

                {expanded && (
                  <CardContent className="flex flex-col gap-2 border-t pt-3">
                    <ul className="flex flex-col gap-2">
                      {s.items.map((item) => (
                        <li key={item.resiId} className="flex items-start gap-1.5 text-xs">
                          <MapPin className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                          <span>
                            <span className="font-medium">{item.recipientName}</span>{" "}
                            <span className="text-muted-foreground">— {item.recipientAddress}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      className="mt-1 gap-1.5 bg-lampu-natrium text-night hover:bg-lampu-natrium/90"
                      disabled={confirmPickupMutation.isPending}
                      onClick={() => confirmPickupMutation.mutate(s.sackId)}
                    >
                      <CheckCircle2 className="size-4" />
                      {confirmPickupMutation.isPending ? "Mengonfirmasi..." : "Konfirmasi Sudah Diambil"}
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {returnPickups.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bawa Retur ke Agen Asal
          </p>
          {returnPickups.map((r) => (
            <Card key={r.id} className="border-white/10 bg-white/[0.03]">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
                  <Undo2 className="size-4.5 text-lampu-natrium" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm tracking-wide">{r.noResi}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Retur milik {r.recipientName} — {r.recipientAddress}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(sackPickups.length > 0 || returnPickups.length > 0) && (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Antar ke Penerima
          </p>
        )}

        {!isLoading && deliveries.length > 0 && (
          <TableSearch value={search} onChange={setSearch} placeholder="Cari no resi atau penerima..." />
        )}

        {filteredDeliveries.map((r) => (
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
                    <span className="truncate text-xs">
                      {r.recipientName} — {r.recipientAddress}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4.5 shrink-0 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </Link>
        ))}

        {!isLoading && deliveries.length > 0 && filteredDeliveries.length === 0 && (
          <EmptyState icon={PackageSearch} title="Tidak ada hasil" description="Coba ubah kata kunci pencarian." />
        )}

        {!isLoading && deliveries.length === 0 && sackPickups.length === 0 && returnPickups.length === 0 && (
          <EmptyState icon={PackageSearch} title="Tidak ada tugas" description="Belum ada tugas untuk kamu hari ini." />
        )}
      </div>
    </div>
  );
}
