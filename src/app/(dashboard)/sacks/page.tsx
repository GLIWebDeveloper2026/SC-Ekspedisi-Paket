"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes,
  PackagePlus,
  MapPinned,
  Truck,
  SearchCheck,
  AlertTriangle,
  ClipboardCheck,
  AlertOctagon,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { TableSkeleton } from "@/components/table-skeleton";
import { SearchableSelect } from "@/components/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SackListItem {
  id: string;
  originInfo: string;
  destinationInfo: string;
  itemCount: number;
  createdAt: string;
}

interface CourierOption {
  id: string;
  name: string;
}

interface AgentOption {
  id: string;
  name: string;
  districtName: string;
}

interface WarehouseOption {
  id: string;
  name: string;
}

interface ResiOption {
  id: string;
  noResi: string;
  recipientName: string;
  isFragile: boolean;
  itemDescription: string | null;
  beratTertagihKg: number;
}

interface DiscrepancyResult {
  sackId: string;
  totalDijanjikan: number;
  totalTercatatMasuk: number;
  paketHilang: {
    resiId: string;
    noResi: string | null;
    pemegangTerakhir: string;
    waktuTerakhirTercatat: string | null;
  }[];
}

interface SackDetail {
  id: string;
  originInfo: string;
  destinationInfo: string;
  isDispatched: boolean;
  items: { resiId: string; noResi: string; arrived: boolean }[];
}

export default function SacksPage() {
  const { data: session } = useSession();
  const canDispatch = session?.user?.role === "KEPALA_GUDANG" || session?.user?.role === "OWNER";
  const isPetugasLoket = session?.user?.role === "PETUGAS_LOKET";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sacks"],
    queryFn: () => apiFetch<{ data: SackListItem[] }>("/api/sacks"),
  });
  const { data: courierData } = useQuery({
    queryKey: ["couriers"],
    queryFn: () => apiFetch<{ data: CourierOption[] }>("/api/couriers"),
    enabled: canDispatch,
  });
  const { data: agentData } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<{ data: AgentOption[] }>("/api/agents"),
  });
  const { data: warehouseData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<{ data: WarehouseOption[] }>("/api/warehouses"),
  });

  const [search, setSearch] = useState("");

  const [dispatchSackId, setDispatchSackId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [discrepancyPanelSackId, setDiscrepancyPanelSackId] = useState<string | null>(null);
  const [discrepancyResult, setDiscrepancyResult] = useState<DiscrepancyResult | null>(null);
  const [arrivalPanelSackId, setArrivalPanelSackId] = useState<string | null>(null);
  const [checkedResiIds, setCheckedResiIds] = useState<Set<string>>(new Set());

  // Form "Buat Karung Baru"
  const [formAgentId, setFormAgentId] = useState("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [resiSearch, setResiSearch] = useState("");
  const [selectedResiIds, setSelectedResiIds] = useState<Set<string>>(new Set());

  const effectiveAgentId = isPetugasLoket ? (session?.user?.agentId ?? "") : formAgentId;

  const filtered = useMemo(
    () => (data?.data ?? []).filter((s) => matchesSearch(search, s.originInfo, s.destinationInfo)),
    [data, search],
  );

  const courierOptions = (courierData?.data ?? []).map((c) => ({ id: c.id, label: c.name }));
  const agentOptions = (agentData?.data ?? []).map((a) => ({
    id: a.id,
    label: `${a.name} (${a.districtName})`,
  }));
  const warehouseOptions = (warehouseData?.data ?? []).map((w) => ({ id: w.id, label: w.name }));

  const { data: availableResi, isFetching: availableResiLoading } = useQuery({
    queryKey: ["resi-available-for-sack", effectiveAgentId, resiSearch],
    queryFn: () => {
      const params = new URLSearchParams({ availableForSack: "true", pageSize: "100" });
      if (effectiveAgentId) params.set("agentId", effectiveAgentId);
      if (resiSearch) params.set("search", resiSearch);
      return apiFetch<{ items: ResiOption[] }>(`/api/resi?${params.toString()}`);
    },
    enabled: !!effectiveAgentId,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const agentName = agentData?.data.find((a) => a.id === effectiveAgentId)?.name ?? "";
      const warehouseName = warehouseData?.data.find((w) => w.id === formWarehouseId)?.name ?? "";
      return apiFetch("/api/sacks", {
        method: "POST",
        body: JSON.stringify({
          originInfo: agentName,
          destinationInfo: warehouseName,
          resiIds: [...selectedResiIds],
        }),
      });
    },
    onSuccess: () => {
      toast.success("Karung berhasil dibuat");
      setFormAgentId("");
      setFormWarehouseId("");
      setSelectedResiIds(new Set());
      setResiSearch("");
      queryClient.invalidateQueries({ queryKey: ["sacks"] });
      queryClient.invalidateQueries({ queryKey: ["resi-available-for-sack"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dispatchMutation = useMutation({
    mutationFn: (sackId: string) =>
      apiFetch(`/api/sacks/${sackId}/dispatch`, {
        method: "POST",
        body: JSON.stringify({ transportedByUserId: selectedCourierId }),
      }),
    onSuccess: () => {
      toast.success("Karung ditandai diangkut ke gudang");
      setDispatchSackId(null);
      setSelectedCourierId("");
      queryClient.invalidateQueries({ queryKey: ["sacks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const discrepancyMutation = useMutation({
    mutationFn: (sackId: string) => apiFetch<DiscrepancyResult>(`/api/sacks/${sackId}/discrepancy`),
    onSuccess: (result, sackId) => {
      setDiscrepancyResult(result);
      setDiscrepancyPanelSackId(sackId);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: arrivalSack, isFetching: arrivalLoading } = useQuery({
    queryKey: ["sack-detail", arrivalPanelSackId],
    queryFn: () => apiFetch<SackDetail>(`/api/sacks/${arrivalPanelSackId}`),
    enabled: !!arrivalPanelSackId,
  });

  const confirmArrivalMutation = useMutation({
    mutationFn: (sackId: string) =>
      apiFetch(`/api/sacks/${sackId}/confirm-arrival`, {
        method: "POST",
        body: JSON.stringify({ resiIds: [...checkedResiIds] }),
      }),
    onSuccess: () => {
      toast.success("Kedatangan dikonfirmasi");
      setArrivalPanelSackId(null);
      setCheckedResiIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["report-discrepancies"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Boxes}
        title="Karung / Sack"
        description="Isi karung dicatat eksplisit supaya selisih jumlah paket bisa dideteksi."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="size-4 text-muted-foreground" />
            Buat Karung Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Asal (Agen)</Label>
                <SearchableSelect
                  placeholder="Pilih agen"
                  value={effectiveAgentId}
                  onValueChange={(v) => {
                    setFormAgentId(v);
                    setSelectedResiIds(new Set());
                  }}
                  options={agentOptions}
                  disabled={isPetugasLoket}
                />
                {isPetugasLoket && (
                  <p className="text-xs text-muted-foreground">Selalu dari agenmu sendiri.</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tujuan (Gudang)</Label>
                <SearchableSelect
                  placeholder="Pilih gudang"
                  value={formWarehouseId}
                  onValueChange={setFormWarehouseId}
                  options={warehouseOptions}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Pilih Resi</Label>
              {!effectiveAgentId ? (
                <p className="text-sm text-muted-foreground">Pilih agen asal dulu untuk melihat resi yang tersedia.</p>
              ) : (
                <div className="rounded-lg border">
                  <div className="border-b p-2">
                    <TableSearch
                      value={resiSearch}
                      onChange={setResiSearch}
                      placeholder="Cari no resi atau penerima..."
                      className="relative"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {availableResiLoading && (
                      <p className="p-3 text-sm text-muted-foreground">Memuat resi...</p>
                    )}
                    {availableResi && availableResi.items.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">
                        Tidak ada resi yang tersedia (semua sudah masuk karung lain, atau belum ada resi).
                      </p>
                    )}
                    {availableResi?.items.map((r) => {
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
                          <span className="text-muted-foreground">{r.recipientName}</span>
                          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            {r.itemDescription && <span>{r.itemDescription}</span>}
                            {r.isFragile && (
                              <Badge variant="destructive" className="gap-1 text-[10px]">
                                <AlertOctagon className="size-3" />
                                Fragile
                              </Badge>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {availableResi && availableResi.items.length > 0 && (
                    <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
                      <span className="text-muted-foreground">{selectedResiIds.size} resi dipilih</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() =>
                            setSelectedResiIds(new Set(availableResi.items.map((r) => r.id)))
                          }
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
              )}
            </div>

            <div>
              <Button
                type="submit"
                disabled={mutation.isPending || !formWarehouseId || selectedResiIds.size === 0}
                className="gap-1.5"
              >
                <PackagePlus className="size-4" />
                {mutation.isPending ? "Menyimpan..." : `Buat Karung (${selectedResiIds.size} resi)`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-muted-foreground" />
            Daftar Karung
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <TableSkeleton cols={5} />}
          {data && (
            <>
              {data.data.length > 0 && (
                <TableSearch value={search} onChange={setSearch} placeholder="Cari asal atau tujuan..." />
              )}
              {filtered.length === 0 ? (
                <EmptyState
                  icon={MapPinned}
                  title={data.data.length === 0 ? "Belum ada karung" : "Tidak ada hasil"}
                  description={
                    data.data.length === 0
                      ? "Karung yang baru dibuat akan muncul di sini."
                      : "Coba ubah kata kunci pencarian."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asal</TableHead>
                      <TableHead>Tujuan</TableHead>
                      <TableHead>Jumlah Item</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.originInfo}</TableCell>
                        <TableCell>{s.destinationInfo}</TableCell>
                        <TableCell className="font-mono tabular-nums">{s.itemCount}</TableCell>
                        <TableCell>{new Date(s.createdAt).toLocaleString("id-ID")}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            {canDispatch &&
                              (dispatchSackId === s.id ? (
                                <div className="flex items-center gap-2">
                                  <SearchableSelect
                                    value={selectedCourierId}
                                    onValueChange={setSelectedCourierId}
                                    options={courierOptions}
                                    placeholder="Pilih kurir..."
                                    className="w-40"
                                  />
                                  <Button
                                    size="sm"
                                    disabled={!selectedCourierId || dispatchMutation.isPending}
                                    onClick={() => dispatchMutation.mutate(s.id)}
                                  >
                                    {dispatchMutation.isPending ? "Mengirim..." : "Konfirmasi"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDispatchSackId(null);
                                      setSelectedCourierId("");
                                    }}
                                  >
                                    Batal
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => setDispatchSackId(s.id)}
                                >
                                  <Truck className="size-3.5" />
                                  Kirim ke Gudang
                                </Button>
                              ))}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={discrepancyMutation.isPending}
                              onClick={() => discrepancyMutation.mutate(s.id)}
                            >
                              <SearchCheck className="size-3.5" />
                              Cek Selisih
                            </Button>
                            {canDispatch && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => {
                                  setArrivalPanelSackId(s.id);
                                  setCheckedResiIds(new Set());
                                }}
                              >
                                <ClipboardCheck className="size-3.5" />
                                Konfirmasi Masuk Gudang
                              </Button>
                            )}
                          </div>

                          {arrivalPanelSackId === s.id && (
                            <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
                              {arrivalLoading && <p className="text-muted-foreground">Memuat isi karung...</p>}
                              {arrivalSack && !arrivalSack.isDispatched && (
                                <p className="text-muted-foreground">
                                  Karung ini belum ditandai &ldquo;Kirim ke Gudang&rdquo; — belum ada yang membawanya.
                                </p>
                              )}
                              {arrivalSack && arrivalSack.isDispatched && (
                                <div className="flex flex-col gap-2">
                                  <p className="text-muted-foreground">
                                    Centang resi yang benar-benar ada secara fisik di karung ini:
                                  </p>
                                  <ul className="flex flex-col gap-1.5">
                                    {arrivalSack.items.map((item) => (
                                      <li key={item.resiId} className="flex items-center gap-2">
                                        <Checkbox
                                          checked={item.arrived || checkedResiIds.has(item.resiId)}
                                          disabled={item.arrived}
                                          onCheckedChange={(checked) =>
                                            setCheckedResiIds((prev) => {
                                              const next = new Set(prev);
                                              if (checked) next.add(item.resiId);
                                              else next.delete(item.resiId);
                                              return next;
                                            })
                                          }
                                        />
                                        <span className="font-mono">{item.noResi}</span>
                                        {item.arrived && (
                                          <span className="text-muted-foreground">(sudah dikonfirmasi)</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      disabled={checkedResiIds.size === 0 || confirmArrivalMutation.isPending}
                                      onClick={() => confirmArrivalMutation.mutate(s.id)}
                                    >
                                      {confirmArrivalMutation.isPending
                                        ? "Menyimpan..."
                                        : `Konfirmasi ${checkedResiIds.size} Resi`}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setArrivalPanelSackId(null);
                                        setCheckedResiIds(new Set());
                                      }}
                                    >
                                      Tutup
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {discrepancyPanelSackId === s.id && discrepancyResult && (
                            <div className="mt-2 rounded-lg border border-stempel/30 bg-stempel/5 p-3 text-xs">
                              {discrepancyResult.paketHilang.length === 0 ? (
                                <p className="text-muted-foreground">
                                  Tidak ada selisih — {discrepancyResult.totalTercatatMasuk}/
                                  {discrepancyResult.totalDijanjikan} resi sudah masuk gudang.
                                </p>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  <p className="flex items-center gap-1.5 font-medium text-stempel">
                                    <AlertTriangle className="size-3.5" />
                                    Selisih terdeteksi: {discrepancyResult.totalTercatatMasuk}/
                                    {discrepancyResult.totalDijanjikan} tercatat masuk
                                  </p>
                                  <ul className="flex flex-col gap-1">
                                    {discrepancyResult.paketHilang.map((p) => (
                                      <li key={p.resiId}>
                                        <span className="font-mono">{p.noResi ?? p.resiId}</span> — pemegang
                                        terakhir: <span className="font-medium">{p.pemegangTerakhir}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
