"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, HandCoins } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const STATUS_FILTERS = ["SEMUA", "BELUM_DIANTAR", "PENDING", "REMITTED", "DISCREPANCY"] as const;

interface CodOverviewItem {
  resiId: string;
  noResi: string;
  recipientName: string;
  nilaiCod: number;
  createdAt: string;
  status: "BELUM_DIANTAR" | "PENDING" | "REMITTED" | "DISCREPANCY";
  courierName: string | null;
  expectedRemit: number | null;
  remitAmount: number | null;
  discrepancyAmount: number | null;
}

const STATUS_LABEL: Record<CodOverviewItem["status"], string> = {
  BELUM_DIANTAR: "Belum Diantar",
  PENDING: "Menunggu Setor",
  REMITTED: "Lunas",
  DISCREPANCY: "Selisih Setor",
};

function statusVariant(status: CodOverviewItem["status"]) {
  if (status === "REMITTED") return "default" as const;
  if (status === "DISCREPANCY") return "destructive" as const;
  if (status === "PENDING") return "secondary" as const;
  return "outline" as const;
}

export default function CodPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cod-overview"],
    queryFn: () => apiFetch<{ data: CodOverviewItem[] }>("/api/cod/overview"),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("SEMUA");

  const filtered = useMemo(() => {
    return (data?.data ?? []).filter(
      (c) =>
        (statusFilter === "SEMUA" || c.status === statusFilter) &&
        matchesSearch(search, c.noResi, c.recipientName, c.courierName ?? ""),
    );
  }, [data, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Wallet}
        title="COD"
        description="Semua resi COD dari saat dibuat sampai lunas disetor — setoran wajib = nilai COD − ongkir − komisi."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="size-4 text-muted-foreground" />
            Daftar COD
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && data.data.length === 0 && (
            <EmptyState
              icon={Wallet}
              title="Belum ada resi COD"
              description="Resi yang dicentang COD saat dibuat akan langsung muncul di sini."
            />
          )}
          {data && data.data.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TableSearch value={search} onChange={setSearch} placeholder="Cari no resi, penerima, kurir..." />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => v && setStatusFilter(v as (typeof STATUS_FILTERS)[number])}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "SEMUA" ? "Semua Status" : STATUS_LABEL[s as CodOverviewItem["status"]]}
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
                      <TableHead>Penerima</TableHead>
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
                        <TableCell>{c.recipientName}</TableCell>
                        <TableCell>{c.courierName ?? "-"}</TableCell>
                        <TableCell>
                          <Money amount={c.nilaiCod} />
                        </TableCell>
                        <TableCell>{c.expectedRemit !== null ? <Money amount={c.expectedRemit} /> : "-"}</TableCell>
                        <TableCell>{c.remitAmount !== null ? <Money amount={c.remitAmount} /> : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(c.status)}>{STATUS_LABEL[c.status]}</Badge>
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
