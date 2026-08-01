"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, Route } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { SearchableSelect } from "@/components/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface District {
  id: string;
  name: string;
  isZonaJauh: boolean;
}
interface CourierOption {
  id: string;
  name: string;
}
interface ResiOption {
  id: string;
  noResi: string;
  recipientName: string;
  recipientAddress: string;
}

export default function SortirPage() {
  const queryClient = useQueryClient();

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => apiFetch<{ data: District[] }>("/api/districts"),
  });

  const [districtId, setDistrictId] = useState("");
  const [resiSearch, setResiSearch] = useState("");
  const [selectedResiIds, setSelectedResiIds] = useState<Set<string>>(new Set());
  const [kurirId, setKurirId] = useState("");

  const districtOptions = (districts?.data ?? []).map((d) => ({ id: d.id, label: d.name }));

  const { data: resiData, isFetching: resiLoading } = useQuery({
    queryKey: ["resi-ready-for-sortir", districtId, resiSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        readyForSortir: "true",
        destinationDistrictId: districtId,
        pageSize: "100",
      });
      if (resiSearch) params.set("search", resiSearch);
      return apiFetch<{ items: ResiOption[] }>(`/api/resi?${params.toString()}`);
    },
    enabled: !!districtId,
  });

  const { data: courierData, isFetching: courierLoading } = useQuery({
    queryKey: ["couriers-for-district", districtId],
    queryFn: () => apiFetch<{ data: CourierOption[] }>(`/api/couriers?districtId=${districtId}`),
    enabled: !!districtId,
  });
  const courierOptions = (courierData?.data ?? []).map((c) => ({ id: c.id, label: c.name }));

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/resi/assign-kurir-batch", {
        method: "POST",
        body: JSON.stringify({ resiIds: [...selectedResiIds], assignedKurirId: kurirId }),
      }),
    onSuccess: () => {
      toast.success(`${selectedResiIds.size} resi ditugaskan ke kurir`);
      setSelectedResiIds(new Set());
      setKurirId("");
      queryClient.invalidateQueries({ queryKey: ["resi-ready-for-sortir"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Route}
        title="Sortir & Assign Kurir Pengantar"
        description="Pilih resi yang searah (1 kecamatan tujuan), assign ke 1 kurir sekaligus — dropdown kurir otomatis tersaring sesuai wilayah cover-nya."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-4 text-muted-foreground" />
            Kecamatan Tujuan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="max-w-sm">
            <SearchableSelect
              placeholder="Pilih kecamatan tujuan"
              value={districtId}
              onValueChange={(v) => {
                setDistrictId(v);
                setSelectedResiIds(new Set());
                setKurirId("");
              }}
              options={districtOptions}
            />
          </div>

          {!districtId ? (
            <p className="text-sm text-muted-foreground">
              Pilih kecamatan tujuan dulu untuk melihat resi yang sudah sampai gudang dan siap disortir.
            </p>
          ) : (
            <>
              <div className="rounded-lg border">
                <div className="border-b p-2">
                  <TableSearch
                    value={resiSearch}
                    onChange={setResiSearch}
                    placeholder="Cari no resi atau penerima..."
                    className="relative"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {resiLoading && <p className="p-3 text-sm text-muted-foreground">Memuat resi...</p>}
                  {resiData && resiData.items.length === 0 && (
                    <EmptyState
                      icon={Truck}
                      title="Tidak ada resi siap sortir"
                      description="Resi yang sudah dikonfirmasi masuk gudang untuk kecamatan ini akan muncul di sini."
                      className="py-8"
                    />
                  )}
                  {resiData?.items.map((r) => {
                    const checked = selectedResiIds.has(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setSelectedResiIds((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            })
                          }
                        />
                        <span className="font-mono">{r.noResi}</span>
                        <span className="truncate text-muted-foreground">
                          {r.recipientName} — {r.recipientAddress}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {resiData && resiData.items.length > 0 && (
                  <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
                    <span className="text-muted-foreground">{selectedResiIds.size} resi dipilih</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setSelectedResiIds(new Set(resiData.items.map((r) => r.id)))}
                      >
                        Pilih semua
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:underline"
                        onClick={() => setSelectedResiIds(new Set())}
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:max-w-xs">
                <Label>Assign ke Kurir</Label>
                <SearchableSelect
                  placeholder={courierLoading ? "Memuat kurir..." : "Pilih kurir"}
                  value={kurirId}
                  onValueChange={setKurirId}
                  options={courierOptions}
                  disabled={courierLoading}
                  emptyText="Tidak ada kurir yang meng-cover kecamatan ini."
                />
              </div>

              <div>
                <Button
                  disabled={mutation.isPending || selectedResiIds.size === 0 || !kurirId}
                  className="gap-1.5"
                  onClick={() => mutation.mutate()}
                >
                  <Truck className="size-4" />
                  {mutation.isPending
                    ? "Menyimpan..."
                    : `Assign ${selectedResiIds.size} Resi ke Kurir`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
