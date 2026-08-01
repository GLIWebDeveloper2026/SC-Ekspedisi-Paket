"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Undo2, FileWarning, PackageX, Truck, PackageCheck, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { SearchableSelect } from "@/components/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReturnListItem {
  id: string;
  resiId: string;
  noResi: string;
  reason: string;
  returnShippingCost: number;
  borneBy: "PENGIRIM" | "PERUSAHAAN";
  initiatedAt: string;
}
interface ReturnQueueItem {
  resiId: string;
  noResi: string;
  senderName: string;
  recipientName: string;
  originAgent: { id: string; name: string };
}
interface ReturnQueueResponse {
  awaitingDispatch: ReturnQueueItem[];
  awaitingArrivalConfirmation: ReturnQueueItem[];
  awaitingFinalProcessing: ReturnQueueItem[];
}
interface ReturnCandidate {
  resiId: string;
  noResi: string;
  daysSinceCreated: number;
}
interface CourierOption {
  id: string;
  name: string;
}

const BORNE_BY = ["PENGIRIM", "PERUSAHAAN"] as const;

export default function ReturnsPage() {
  const { data: session } = useSession();
  const isGudangView = session?.user?.role === "KEPALA_GUDANG" || session?.user?.role === "OWNER";
  const isLoketView = session?.user?.role === "PETUGAS_LOKET" || session?.user?.role === "OWNER";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: () => apiFetch<{ data: ReturnListItem[] }>("/api/returns"),
  });
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ["returns-queue"],
    queryFn: () => apiFetch<ReturnQueueResponse>("/api/returns/pending"),
  });
  const { data: candidateData } = useQuery({
    queryKey: ["return-candidates"],
    queryFn: () => apiFetch<{ data: ReturnCandidate[] }>("/api/reports/pending-returns"),
    enabled: isGudangView,
  });
  const { data: courierData } = useQuery({
    queryKey: ["couriers"],
    queryFn: () => apiFetch<{ data: CourierOption[] }>("/api/couriers"),
    enabled: isGudangView,
  });
  const courierOptions = (courierData?.data ?? []).map((c) => ({ id: c.id, label: c.name }));

  const [dispatchResiId, setDispatchResiId] = useState<string | null>(null);
  const [dispatchCourierId, setDispatchCourierId] = useState("");
  const [processingResiId, setProcessingResiId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [borneBy, setBorneBy] = useState<(typeof BORNE_BY)[number]>("PENGIRIM");
  const [search, setSearch] = useState("");
  const [borneByFilter, setBorneByFilter] = useState<"SEMUA" | (typeof BORNE_BY)[number]>("SEMUA");

  const filtered = useMemo(() => {
    return (data?.data ?? []).filter(
      (r) =>
        (borneByFilter === "SEMUA" || r.borneBy === borneByFilter) &&
        matchesSearch(search, r.noResi, r.reason),
    );
  }, [data, search, borneByFilter]);

  const invalidateQueue = () => {
    queryClient.invalidateQueries({ queryKey: ["returns-queue"] });
    queryClient.invalidateQueries({ queryKey: ["return-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["returns"] });
  };

  const markReturMutation = useMutation({
    mutationFn: (resiId: string) => apiFetch(`/api/resi/${resiId}/mark-retur-gudang`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Ditandai retur — masuk antrian jemput kembali");
      invalidateQueue();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dispatchMutation = useMutation({
    mutationFn: (resiId: string) =>
      apiFetch(`/api/resi/${resiId}/dispatch-return-to-agent`, {
        method: "POST",
        body: JSON.stringify({ transportedByUserId: dispatchCourierId }),
      }),
    onSuccess: () => {
      toast.success("Kurir ditugaskan membawa balik ke agen asal");
      setDispatchResiId(null);
      setDispatchCourierId("");
      invalidateQueue();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmArrivalMutation = useMutation({
    mutationFn: (resiId: string) => apiFetch(`/api/resi/${resiId}/confirm-return-arrival`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Kedatangan di agen asal dikonfirmasi");
      invalidateQueue();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify({ resiId: processingResiId, reason, borneBy }),
      }),
    onSuccess: () => {
      toast.success("Retur diproses — ongkir balik dihitung otomatis dari tarif yang berlaku sekarang");
      setProcessingResiId(null);
      setReason("");
      setBorneBy("PENGIRIM");
      invalidateQueue();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Undo2}
        title="Retur"
        description="Gudang → balik ke agen asal → Petugas Loket serah-terima & tagih ongkir balik ke pengirim."
      />

      {isGudangView && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Kandidat Retur (&gt;7 Hari Belum Diambil)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!candidateData || candidateData.data.length === 0 ? (
              <EmptyState icon={Clock} title="Tidak ada kandidat" description="Resi yang >7 hari nginap tanpa diambil akan muncul di sini." />
            ) : (
              <div className="flex flex-col gap-2">
                {candidateData.data.map((c) => (
                  <div key={c.resiId} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-mono font-medium">{c.noResi}</p>
                      <p className="text-xs text-muted-foreground">{c.daysSinceCreated} hari sejak dibuat</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markReturMutation.isPending}
                      onClick={() => markReturMutation.mutate(c.resiId)}
                    >
                      Tandai Retur
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isGudangView && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-4 text-muted-foreground" />
              Menunggu Dijemput Kembali ke Agen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
            {queueData && queueData.awaitingDispatch.length === 0 && (
              <EmptyState icon={Truck} title="Tidak ada yang menunggu" />
            )}
            <div className="flex flex-col gap-3">
              {queueData?.awaitingDispatch.map((p) => (
                <div key={p.resiId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-medium">{p.noResi}</p>
                      <p className="text-xs text-muted-foreground">balik ke {p.originAgent.name}</p>
                    </div>
                    {dispatchResiId !== p.resiId && (
                      <Button size="sm" variant="outline" onClick={() => setDispatchResiId(p.resiId)}>
                        Assign Kurir
                      </Button>
                    )}
                  </div>
                  {dispatchResiId === p.resiId && (
                    <div className="mt-3 flex items-center gap-2 border-t pt-3">
                      <SearchableSelect
                        value={dispatchCourierId}
                        onValueChange={setDispatchCourierId}
                        options={courierOptions}
                        placeholder="Pilih kurir..."
                        className="w-48"
                      />
                      <Button
                        size="sm"
                        disabled={!dispatchCourierId || dispatchMutation.isPending}
                        onClick={() => dispatchMutation.mutate(p.resiId)}
                      >
                        Konfirmasi
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDispatchResiId(null)}>
                        Batal
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoketView && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4 text-muted-foreground" />
              Konfirmasi Sampai di Agen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueData && queueData.awaitingArrivalConfirmation.length === 0 && (
              <EmptyState icon={PackageCheck} title="Tidak ada yang menunggu" description="Resi yang sedang dalam perjalanan retur ke agenmu akan muncul di sini." />
            )}
            <div className="flex flex-col gap-2">
              {queueData?.awaitingArrivalConfirmation.map((p) => (
                <div key={p.resiId} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-mono font-medium">{p.noResi}</p>
                    <p className="text-xs text-muted-foreground">{p.senderName}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={confirmArrivalMutation.isPending}
                    onClick={() => confirmArrivalMutation.mutate(p.resiId)}
                  >
                    Sudah Sampai
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoketView && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageX className="size-4 text-muted-foreground" />
              Retur Menunggu Diproses (Serah-Terima ke Pengirim)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueData && queueData.awaitingFinalProcessing.length === 0 && (
              <EmptyState
                icon={PackageX}
                title="Tidak ada retur menunggu"
                description="Resi yang sudah dikonfirmasi sampai di agen akan muncul di sini."
              />
            )}
            <div className="flex flex-col gap-3">
              {queueData?.awaitingFinalProcessing.map((p) => (
                <div key={p.resiId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-medium">{p.noResi}</p>
                      <p className="text-xs text-muted-foreground">{p.senderName}</p>
                    </div>
                    {processingResiId !== p.resiId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setProcessingResiId(p.resiId);
                          setReason("");
                          setBorneBy("PENGIRIM");
                        }}
                      >
                        <Undo2 className="size-3.5" />
                        Proses Retur
                      </Button>
                    )}
                  </div>

                  {processingResiId === p.resiId && (
                    <form
                      className="mt-3 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate();
                      }}
                    >
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label>Alasan</Label>
                        <Input
                          required
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="mis. Alamat tidak ditemukan, 3x gagal antar"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Ditanggung Oleh</Label>
                        <Select value={borneBy} onValueChange={(v) => setBorneBy(v as typeof borneBy)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BORNE_BY.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground sm:col-span-3">
                        Ongkir balik dihitung otomatis pakai tarif yang berlaku hari ini (bukan tarif
                        saat resi ini dibuat) — berat & dimensi tetap dari resi asli.
                      </p>
                      <div className="flex gap-2 sm:col-span-3">
                        <Button type="submit" size="sm" disabled={mutation.isPending} className="gap-1.5">
                          {mutation.isPending ? "Menyimpan..." : "Konfirmasi Retur"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setProcessingResiId(null)}
                        >
                          Batal
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="size-4 text-muted-foreground" />
            Riwayat Retur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
            <>
              {data.data.length > 0 && (
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <TableSearch value={search} onChange={setSearch} placeholder="Cari no resi atau alasan..." />
                  <Select
                    value={borneByFilter}
                    onValueChange={(v) => v && setBorneByFilter(v as typeof borneByFilter)}
                  >
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEMUA">Semua Penanggung</SelectItem>
                      {BORNE_BY.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Undo2}
                  title={data.data.length === 0 ? "Belum ada retur" : "Tidak ada hasil"}
                  description={
                    data.data.length === 0
                      ? "Retur yang diproses akan muncul di sini."
                      : "Coba ubah kata kunci atau filter."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No Resi</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Ongkir Balik</TableHead>
                      <TableHead>Ditanggung</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.noResi}</TableCell>
                        <TableCell>{r.reason}</TableCell>
                        <TableCell>
                          <Money amount={r.returnShippingCost} />
                        </TableCell>
                        <TableCell>{r.borneBy}</TableCell>
                        <TableCell>{new Date(r.initiatedAt).toLocaleString("id-ID")}</TableCell>
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
