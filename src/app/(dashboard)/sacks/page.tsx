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

export default function SacksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sacks"],
    queryFn: () => apiFetch<{ data: SackListItem[] }>("/api/sacks"),
  });

  const [originInfo, setOriginInfo] = useState("");
  const [destinationInfo, setDestinationInfo] = useState("");
  const [resiIdsText, setResiIdsText] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/sacks", {
        method: "POST",
        body: JSON.stringify({
          originInfo,
          destinationInfo,
          resiIds: resiIdsText
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: () => {
      toast.success("Karung berhasil dibuat");
      setOriginInfo("");
      setDestinationInfo("");
      setResiIdsText("");
      queryClient.invalidateQueries({ queryKey: ["sacks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Karung / Sack</h1>
        <p className="text-muted-foreground">
          Isi karung dicatat eksplisit supaya selisih jumlah paket bisa dideteksi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat Karung Baru</CardTitle>
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
              <Label>Asal</Label>
              <Input required value={originInfo} onChange={(e) => setOriginInfo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tujuan</Label>
              <Input
                required
                value={destinationInfo}
                onChange={(e) => setDestinationInfo(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Resi Id (pisahkan dengan koma atau baris baru)</Label>
              <Textarea
                required
                rows={4}
                value={resiIdsText}
                onChange={(e) => setResiIdsText(e.target.value)}
                placeholder={"resi_001\nresi_002"}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menyimpan..." : "Buat Karung"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Karung</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asal</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead>Jumlah Item</TableHead>
                  <TableHead>Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.originInfo}</TableCell>
                    <TableCell>{s.destinationInfo}</TableCell>
                    <TableCell>{s.itemCount}</TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Belum ada karung.
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
