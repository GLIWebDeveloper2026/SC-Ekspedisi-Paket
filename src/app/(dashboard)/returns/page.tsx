"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Undo2, FileWarning } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
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

const BORNE_BY = ["PENGIRIM", "PERUSAHAAN"] as const;

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: () => apiFetch<{ data: ReturnListItem[] }>("/api/returns"),
  });

  const [resiId, setResiId] = useState("");
  const [reason, setReason] = useState("");
  const [returnShippingCost, setReturnShippingCost] = useState("");
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

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify({
          resiId,
          reason,
          returnShippingCost: Number(returnShippingCost),
          borneBy,
        }),
      }),
    onSuccess: () => {
      toast.success("Retur berhasil diajukan");
      setResiId("");
      setReason("");
      setReturnShippingCost("");
      queryClient.invalidateQueries({ queryKey: ["returns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Undo2}
        title="Retur"
        description="Retur otomatis setelah 7 hari tidak terkirim/diambil, ongkir balik ditanggung sesuai kebijakan."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="size-4 text-muted-foreground" />
            Ajukan Retur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
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
              <Label>Ongkir Balik (Rp)</Label>
              <Input
                type="number"
                required
                value={returnShippingCost}
                onChange={(e) => setReturnShippingCost(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Alasan</Label>
              <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
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
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending} className="gap-1.5">
                <Undo2 className="size-4" />
                {mutation.isPending ? "Menyimpan..." : "Ajukan Retur"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="size-4 text-muted-foreground" />
            Daftar Retur
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
                      ? "Retur yang diajukan akan muncul di sini."
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
