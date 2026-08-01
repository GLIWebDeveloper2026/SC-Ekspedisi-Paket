"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
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
      <div>
        <h1 className="text-2xl font-semibold">Retur</h1>
        <p className="text-muted-foreground">
          Retur otomatis setelah 7 hari tidak terkirim/diambil, ongkir balik ditanggung sesuai
          kebijakan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajukan Retur</CardTitle>
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menyimpan..." : "Ajukan Retur"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Retur</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
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
                {data.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.noResi}</TableCell>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell>Rp{r.returnShippingCost.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{r.borneBy}</TableCell>
                    <TableCell>{new Date(r.initiatedAt).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada retur.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
