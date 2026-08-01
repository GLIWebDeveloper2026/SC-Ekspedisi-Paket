"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Percent, PlusCircle, History } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
  const [filterServiceType, setFilterServiceType] = useState<"SEMUA" | (typeof SERVICE_TYPES)[number]>(
    "SEMUA",
  );

  const filtered = useMemo(() => {
    return (data?.data ?? []).filter(
      (t) => filterServiceType === "SEMUA" || t.serviceType === filterServiceType,
    );
  }, [data, filterServiceType]);

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
      <PageHeader
        icon={Percent}
        title="Tarif"
        description="Tarif adalah data bertanggal (versioned) — resi lama tetap merujuk snapshot tarif saat dibuat, tidak ikut berubah kalau tarif direvisi."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="size-4 text-muted-foreground" />
            Buat Versi Tarif Baru
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
              <Button type="submit" disabled={mutation.isPending} className="gap-1.5">
                <PlusCircle className="size-4" />
                {mutation.isPending ? "Menyimpan..." : "Buat Versi Tarif"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Riwayat Tarif
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {data && data.data.length === 0 && (
            <EmptyState icon={Percent} title="Belum ada tarif" description="Buat versi tarif pertama di atas." />
          )}
          {data && data.data.length > 0 && (
            <>
              <div className="mb-4">
                <Select
                  value={filterServiceType}
                  onValueChange={(v) => v && setFilterServiceType(v as typeof filterServiceType)}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMUA">Semua Layanan</SelectItem>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <EmptyState icon={Percent} title="Tidak ada hasil" description="Coba ubah filter layanan." />
              ) : (
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
                    {filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.serviceType}</TableCell>
                        <TableCell>
                          <Money amount={t.ratePerKg} />
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">{t.volumetricDivisor}</TableCell>
                        <TableCell>{new Date(t.effectiveFrom).toLocaleDateString("id-ID")}</TableCell>
                        <TableCell>
                          {t.effectiveTo ? new Date(t.effectiveTo).toLocaleDateString("id-ID") : "Aktif"}
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
