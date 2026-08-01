"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<RemitResponse>(`/api/cod/${resiId}/remit`, {
        method: "POST",
        body: JSON.stringify({ remitAmount: Number(remitAmount) }),
      }),
    onSuccess: (res) => {
      toast.success(
        res.remitStatus === "REMITTED"
          ? "Setoran lunas, tidak ada diskrepansi"
          : `Diskrepansi terdeteksi: Rp${res.discrepancyAmount.toLocaleString("id-ID")}`,
      );
      setResiId("");
      setRemitAmount("");
      queryClient.invalidateQueries({ queryKey: ["cod-list"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">COD</h1>
        <p className="text-muted-foreground">
          Setoran wajib kurir = nilai COD − ongkir − komisi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setor Uang COD</CardTitle>
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
              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? "Menyimpan..." : "Setor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar COD</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
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
                {data.data.map((c) => (
                  <TableRow key={c.resiId}>
                    <TableCell>{c.noResi}</TableCell>
                    <TableCell>{c.courierName}</TableCell>
                    <TableCell>Rp{c.collectedAmount.toLocaleString("id-ID")}</TableCell>
                    <TableCell>Rp{c.expectedRemit.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{c.remitAmount ? `Rp${c.remitAmount.toLocaleString("id-ID")}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.remitStatus)}>{c.remitStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada data COD.
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
