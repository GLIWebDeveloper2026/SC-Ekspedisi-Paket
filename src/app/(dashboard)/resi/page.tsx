"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Plus, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
import { TableSkeleton } from "@/components/table-skeleton";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const SERVICE_TYPE_FILTERS = ["SEMUA", "REGULER", "KILAT", "KARGO"] as const;

interface ResiListItem {
  id: string;
  noResi: string;
  senderName: string;
  recipientName: string;
  serviceType: string;
  totalOngkir: number;
  isCod: boolean;
  createdAt: string;
  originAgent: { name: string };
}

interface ResiListResponse {
  items: ResiListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
}

export default function ResiListPage() {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<(typeof SERVICE_TYPE_FILTERS)[number]>("SEMUA");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ["resi-list", search, serviceFilter, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (serviceFilter !== "SEMUA") params.set("serviceType", serviceFilter);
      return apiFetch<ResiListResponse>(`/api/resi?${params.toString()}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={PackageSearch}
        title="Resi"
        description="Daftar resi yang sudah dibuat"
        action={
          <Button render={<Link href="/resi/new" />} nativeButton={false} className="gap-1.5">
            <Plus className="size-4" />
            Buat Resi
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading && <TableSkeleton cols={7} />}
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {(error as Error).message}
            </p>
          )}
          {data && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <TableSearch
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Cari no resi, pengirim, penerima..."
                  className="relative max-w-sm"
                />
                <Select
                  value={serviceFilter}
                  onValueChange={(v) => {
                    if (!v) return;
                    setServiceFilter(v as (typeof SERVICE_TYPE_FILTERS)[number]);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_FILTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "SEMUA" ? "Semua Layanan" : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {data.items.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title={data.totalItems === 0 && !search ? "Belum ada resi" : "Tidak ada hasil"}
                  description={
                    data.totalItems === 0 && !search
                      ? "Klik 'Buat Resi' untuk membuat resi pertama."
                      : "Coba ubah kata kunci atau filter layanan."
                  }
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No Resi</TableHead>
                        <TableHead>Pengirim</TableHead>
                        <TableHead>Penerima</TableHead>
                        <TableHead>Agen Asal</TableHead>
                        <TableHead>Layanan</TableHead>
                        <TableHead>Ongkir</TableHead>
                        <TableHead>COD</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Link href={`/resi/${r.id}`} className="font-medium text-primary hover:underline">
                              {r.noResi}
                            </Link>
                          </TableCell>
                          <TableCell>{r.senderName}</TableCell>
                          <TableCell>{r.recipientName}</TableCell>
                          <TableCell>{r.originAgent?.name}</TableCell>
                          <TableCell>{r.serviceType}</TableCell>
                          <TableCell>
                            <Money amount={r.totalOngkir} />
                          </TableCell>
                          <TableCell>{r.isCod ? <Badge>COD</Badge> : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={data.page}
                    pageSize={data.pageSize}
                    totalItems={data.totalItems}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
