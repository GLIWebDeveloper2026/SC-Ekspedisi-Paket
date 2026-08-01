"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, HandCoins } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { Money } from "@/components/money";
import { CapStempel } from "@/components/cap-stempel";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const STATUS_FILTERS = ["SEMUA", "PENDING", "REMITTED", "DISCREPANCY"] as const;

interface CodItem {
  resiId: string;
  noResi: string;
  courierName: string;
  collectedAmount: number;
  expectedRemit: number;
  remitStatus: "PENDING" | "REMITTED" | "DISCREPANCY";
  remitAmount: number | null;
  discrepancyAmount: number | null;
}

interface RemitResponse {
  expectedRemit: number;
  remitAmount: number;
  discrepancyAmount: number;
  remitStatus: string;
}

function statusVariant(status: CodItem["remitStatus"]) {
  if (status === "REMITTED") return "default" as const;
  if (status === "DISCREPANCY") return "destructive" as const;
  return "secondary" as const;
}

export default function CodPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cod-list"],
    queryFn: () => apiFetch<{ data: CodItem[] }>("/api/cod"),
  });

  const [resiId, setResiId] = useState("");
  const [remitAmount, setRemitAmount] = useState("");
  const [stamp, setStamp] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("SEMUA");

  const filtered = useMemo(() => {
    return (data?.data ?? []).filter(
      (c) =>
        (statusFilter === "SEMUA" || c.remitStatus === statusFilter) &&
        matchesSearch(search, c.noResi, c.courierName),
    );
  }, [data, search, statusFilter]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<RemitResponse>(`/api/cod/${resiId}/remit`, {
        method: "POST",
        body: JSON.stringify({ remitAmount: Number(remitAmount) }),
      }),
    onSuccess: (res) => {
      if (res.remitStatus === "REMITTED") {
        setStamp(true);
        toast.success("Setoran lunas, tidak ada diskrepansi");
      } else {
        toast.error(`Diskrepansi terdeteksi: Rp${res.discrepancyAmount.toLocaleString("id-ID")}`);
      }
      setResiId("");
      setRemitAmount("");
      queryClient.invalidateQueries({ queryKey: ["cod-list"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <CapStempel show={stamp} label="Lunas" onDone={() => setStamp(false)} />
      <PageHeader icon={Wallet} title="COD" description="Setoran wajib kurir = nilai COD − ongkir − komisi." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="size-4 text-muted-foreground" />
            Setor Uang COD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label>Resi Id</Label>
              <Input required value={resiId} onChange={(e) => setResiId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Jumlah Setoran (Rp)</Label>
              <Input
                type="number"
                required
                value={remitAmount}
                onChange={(e) => setRemitAmount(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={mutation.isPending} className="w-full gap-1.5">
                <HandCoins className="size-4" />
                {mutation.isPending ? "Menyimpan..." : "Setor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            Daftar COD
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && data.data.length === 0 && (
            <EmptyState icon={Wallet} title="Belum ada data COD" description="Data COD akan muncul setelah delivery attempt berhasil." />
          )}
          {data && data.data.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TableSearch value={search} onChange={setSearch} placeholder="Cari no resi atau kurir..." />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => v && setStatusFilter(v as (typeof STATUS_FILTERS)[number])}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "SEMUA" ? "Semua Status" : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <EmptyState icon={Wallet} title="Tidak ada hasil" description="Coba ubah kata kunci atau filter status." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No Resi</TableHead>
                      <TableHead>Kurir</TableHead>
                      <TableHead>Nilai COD</TableHead>
                      <TableHead>Setoran Wajib</TableHead>
                      <TableHead>Setoran Aktual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.resiId}>
                        <TableCell>{c.noResi}</TableCell>
                        <TableCell>{c.courierName}</TableCell>
                        <TableCell>
                          <Money amount={c.collectedAmount} />
                        </TableCell>
                        <TableCell>
                          <Money amount={c.expectedRemit} />
                        </TableCell>
                        <TableCell>{c.remitAmount !== null ? <Money amount={c.remitAmount} /> : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(c.remitStatus)}>{c.remitStatus}</Badge>
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
