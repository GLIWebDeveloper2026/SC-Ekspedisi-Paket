"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, ReceiptText, History, Printer } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

interface PaymentListItem {
  id: string;
  payerName: string;
  method: string;
  totalAmount: number;
  paymentDate: string;
  itemCount: number;
}
interface AgentOption {
  id: string;
  name: string;
  districtName: string;
}
interface ResiOption {
  id: string;
  noResi: string;
  recipientName: string;
  totalOngkir: number;
  totalTagihan: number;
}
interface CreatePaymentResponse {
  id: string;
}

const METHODS = ["CASH", "TRANSFER", "QRIS"];

export default function PaymentsPage() {
  const { data: session } = useSession();
  const isPetugasLoket = session?.user?.role === "PETUGAS_LOKET";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => apiFetch<{ data: PaymentListItem[] }>("/api/payment-transactions"),
  });
  const { data: agentData } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<{ data: AgentOption[] }>("/api/agents"),
  });

  const [payerName, setPayerName] = useState("");
  const [method, setMethod] = useState("CASH");
  const [formAgentId, setFormAgentId] = useState("");
  const [resiSearch, setResiSearch] = useState("");
  const [selectedResiIds, setSelectedResiIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);

  const effectiveAgentId = isPetugasLoket ? (session?.user?.agentId ?? "") : formAgentId;
  const agentOptions = (agentData?.data ?? []).map((a) => ({
    id: a.id,
    label: `${a.name} (${a.districtName})`,
  }));

  const filtered = useMemo(
    () => (data?.data ?? []).filter((p) => matchesSearch(search, p.payerName, p.method)),
    [data, search],
  );

  const { data: availableResi, isFetching: availableResiLoading } = useQuery({
    queryKey: ["resi-available-for-payment", effectiveAgentId, resiSearch],
    queryFn: () => {
      const params = new URLSearchParams({ availableForPayment: "true", pageSize: "100" });
      if (effectiveAgentId) params.set("agentId", effectiveAgentId);
      if (resiSearch) params.set("search", resiSearch);
      return apiFetch<{ items: ResiOption[] }>(`/api/resi?${params.toString()}`);
    },
    enabled: !!effectiveAgentId,
  });

  const selectedTotal = (availableResi?.items ?? [])
    .filter((r) => selectedResiIds.has(r.id))
    .reduce((sum, r) => sum + r.totalTagihan, 0);

  const mutation = useMutation({
    mutationFn: () => {
      const items = (availableResi?.items ?? [])
        .filter((r) => selectedResiIds.has(r.id))
        .map((r) => ({ resiId: r.id, amountAllocated: r.totalTagihan }));
      return apiFetch<CreatePaymentResponse>("/api/payment-transactions", {
        method: "POST",
        body: JSON.stringify({ payerName, method, items }),
      });
    },
    onSuccess: (res) => {
      toast.success("Transaksi pembayaran berhasil dibuat");
      setLastReceiptId(res.id);
      setPayerName("");
      setSelectedResiIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["resi-available-for-payment"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={CreditCard}
        title="Pembayaran Batch"
        description="Satu transaksi bisa mencakup banyak resi (1:N) — tiap resi bisa punya nasib berbeda tanpa mengubah transaksi aslinya."
      />

      {lastReceiptId && (
        <Card className="border-lampu-natrium/40 bg-lampu-natrium/5">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm">Transaksi berhasil dibuat.</p>
            <Button
              render={<Link href={`/payments/${lastReceiptId}/receipt`} target="_blank" />}
              nativeButton={false}
              size="sm"
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              Cetak Bukti Transaksi
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-4 text-muted-foreground" />
            Buat Transaksi Pembayaran
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>Nama Pembayar</Label>
                <Input required value={payerName} onChange={(e) => setPayerName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Metode</Label>
                <Select value={method} onValueChange={(v) => setMethod(v ?? "CASH")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Agen</Label>
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
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Pilih Resi (non-COD, belum dibayar)</Label>
              {!effectiveAgentId ? (
                <p className="text-sm text-muted-foreground">Pilih agen dulu untuk melihat resi yang tersedia.</p>
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
                        Tidak ada resi non-COD yang belum dibayar untuk agen ini.
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
                          <span className="ml-auto flex items-center gap-1.5">
                            {r.totalTagihan !== r.totalOngkir && (
                              <Badge variant="outline" className="text-[10px]">
                                disesuaikan
                              </Badge>
                            )}
                            <Money amount={r.totalTagihan} />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {availableResi && availableResi.items.length > 0 && (
                    <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        {selectedResiIds.size} resi dipilih — total <Money amount={selectedTotal} />
                      </span>
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
                disabled={mutation.isPending || selectedResiIds.size === 0}
                className="gap-1.5"
              >
                <ReceiptText className="size-4" />
                {mutation.isPending
                  ? "Menyimpan..."
                  : `Buat Transaksi (${selectedResiIds.size} resi)`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Riwayat Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
            <>
              {data.data.length > 0 && (
                <TableSearch value={search} onChange={setSearch} placeholder="Cari nama pembayar atau metode..." />
              )}
              {filtered.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title={data.data.length === 0 ? "Belum ada transaksi" : "Tidak ada hasil"}
                  description={
                    data.data.length === 0
                      ? "Transaksi pembayaran akan muncul di sini."
                      : "Coba ubah kata kunci pencarian."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pembayar</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Jumlah Resi</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.payerName}</TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell className="font-mono tabular-nums">{p.itemCount}</TableCell>
                        <TableCell>
                          <Money amount={p.totalAmount} />
                        </TableCell>
                        <TableCell>{new Date(p.paymentDate).toLocaleString("id-ID")}</TableCell>
                        <TableCell>
                          <Button
                            render={<Link href={`/payments/${p.id}/receipt`} target="_blank" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                          >
                            <Printer className="size-3.5" />
                            Cetak
                          </Button>
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
