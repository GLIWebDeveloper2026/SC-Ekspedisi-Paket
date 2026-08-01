"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const METHODS = ["CASH", "TRANSFER", "QRIS"];

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => apiFetch<{ data: PaymentListItem[] }>("/api/payment-transactions"),
  });

  const [payerName, setPayerName] = useState("");
  const [method, setMethod] = useState("CASH");
  const [itemsText, setItemsText] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const items = itemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [resiId, amount] = line.split(",").map((s) => s.trim());
          return { resiId, amountAllocated: Number(amount) };
        });

      return apiFetch("/api/payment-transactions", {
        method: "POST",
        body: JSON.stringify({ payerName, method, items }),
      });
    },
    onSuccess: () => {
      toast.success("Transaksi pembayaran berhasil dibuat");
      setPayerName("");
      setItemsText("");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pembayaran Batch</h1>
        <p className="text-muted-foreground">
          Satu transaksi bisa mencakup banyak resi (1:N) — tiap resi bisa punya nasib berbeda tanpa
          mengubah transaksi aslinya.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat Transaksi Pembayaran</CardTitle>
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
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Item (format: resiId,jumlah — satu baris per resi)</Label>
              <Textarea
                required
                rows={4}
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                placeholder={"resi_010,20000\nresi_011,25000"}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menyimpan..." : "Buat Transaksi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pembayar</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Jumlah Resi</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.payerName}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.itemCount}</TableCell>
                    <TableCell>Rp{p.totalAmount.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{new Date(p.paymentDate).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada transaksi.
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
