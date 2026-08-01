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

interface TariffRuleItem {
  id: string;
  serviceType: string;
  ratePerKg: number;
  volumetricDivisor: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

const SERVICE_TYPES = ["REGULER", "KILAT", "KARGO"] as const;

export default function TariffsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tariff-rules"],
    queryFn: () => apiFetch<{ data: TariffRuleItem[] }>("/api/tariff-rules"),
  });

  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>("REGULER");
  const [ratePerKg, setRatePerKg] = useState("");
  const [volumetricDivisor, setVolumetricDivisor] = useState("6000");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/tariff-rules", {
        method: "POST",
        body: JSON.stringify({
          serviceType,
          ratePerKg: Number(ratePerKg),
          volumetricDivisor: Number(volumetricDivisor),
          effectiveFrom: new Date(effectiveFrom).toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success("Versi tarif baru dibuat — versi lama otomatis ditutup");
      setRatePerKg("");
      queryClient.invalidateQueries({ queryKey: ["tariff-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tarif</h1>
        <p className="text-muted-foreground">
          Tarif adalah data bertanggal (versioned) — resi lama tetap merujuk snapshot tarif saat
          dibuat, tidak ikut berubah kalau tarif direvisi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat Versi Tarif Baru</CardTitle>
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
              <Label>Jenis Layanan</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as typeof serviceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Berlaku Sejak</Label>
              <Input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tarif per Kg (Rp)</Label>
              <Input
                type="number"
                required
                value={ratePerKg}
                onChange={(e) => setRatePerKg(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Volumetric Divisor</Label>
              <Input
                type="number"
                required
                value={volumetricDivisor}
                onChange={(e) => setVolumetricDivisor(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menyimpan..." : "Buat Versi Tarif"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Tarif</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Rate/Kg</TableHead>
                  <TableHead>Divisor Volumetrik</TableHead>
                  <TableHead>Berlaku Dari</TableHead>
                  <TableHead>Berlaku Sampai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.serviceType}</TableCell>
                    <TableCell>Rp{t.ratePerKg.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{t.volumetricDivisor}</TableCell>
                    <TableCell>{new Date(t.effectiveFrom).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>
                      {t.effectiveTo ? new Date(t.effectiveTo).toLocaleDateString("id-ID") : "Aktif"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
