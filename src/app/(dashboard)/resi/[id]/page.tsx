"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  MapPin,
  History,
  UserCircle2,
  Boxes,
  Warehouse,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  Undo2,
  CircleDot,
  ArrowLeft,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

const EVENT_ICONS: Record<string, LucideIcon> = {
  DIBUAT_DI_LOKET: Package,
  MASUK_KARUNG: Boxes,
  KELUAR_KARUNG: Boxes,
  MASUK_GUDANG: Warehouse,
  KELUAR_GUDANG: Warehouse,
  DISERAHKAN_KE_KURIR: Truck,
  DIOPER_KE_KURIR_LAIN: ArrowRightLeft,
  DELIVERY_ATTEMPT: Truck,
  TERKIRIM: CheckCircle2,
  RETUR_KE_GUDANG: Undo2,
  DIANGKUT_KE_GUDANG: Truck,
  DIANGKUT_KEMBALI_KE_AGEN: Truck,
  DITERIMA_DI_AGEN_ASAL: Package,
  RETUR_KE_PENGIRIM: Undo2,
};

interface ResiAdjustmentItem {
  id: string;
  adjustmentType: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface ResiDetail {
  id: string;
  noResi: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientAddress: string;
  serviceType: string;
  beratAktualKg: number;
  beratTertagihKg: number;
  biayaDasar: number;
  biayaZona: number;
  totalOngkir: number;
  totalTagihan: number;
  adjustments: ResiAdjustmentItem[];
  isCod: boolean;
  nilaiCod: number | null;
  createdAt: string;
}

interface CustodyHistoryItem {
  eventType: string;
  fromEntity: string | null;
  toEntity: string | null;
  toEntityLabel: string | null;
  notes: string | null;
  timestamp: string;
}

interface CustodyHistoryResponse {
  resiId: string;
  history: CustodyHistoryItem[];
  currentHolder: { eventType: string; toEntity: string | null; toEntityLabel: string | null } | null;
}

export default function ResiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: resi, isLoading } = useQuery({
    queryKey: ["resi", id],
    queryFn: () => apiFetch<ResiDetail>(`/api/resi/${id}`),
  });

  const { data: custody } = useQuery({
    queryKey: ["resi-custody", id],
    queryFn: () => apiFetch<CustodyHistoryResponse>(`/api/resi/${id}/custody`),
  });

  if (isLoading || !resi) return <p className="text-sm text-muted-foreground">Memuat...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          render={<Link href="/resi" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 -ml-2"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Resi
        </Button>
        <Button
          render={<Link href={`/resi/${id}/label`} target="_blank" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Printer className="size-4" />
          Cetak Label
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-terpal/10 text-terpal">
          <Package className="size-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">{resi.noResi}</h1>
          <p className="text-muted-foreground">
            {resi.senderName} → {resi.recipientName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              Rincian Ongkir
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Layanan" value={resi.serviceType} />
            <Row label="Berat Aktual" value={`${resi.beratAktualKg} kg`} mono />
            <Row label="Berat Tertagih" value={`${resi.beratTertagihKg} kg`} mono />
            <Row label="Biaya Dasar" value={`Rp${resi.biayaDasar.toLocaleString("id-ID")}`} mono />
            <Row label="Biaya Zona" value={`Rp${resi.biayaZona.toLocaleString("id-ID")}`} mono />
            <Row label="Total Ongkir" value={`Rp${resi.totalOngkir.toLocaleString("id-ID")}`} mono />
            {resi.adjustments.length > 0 && (
              <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-2">
                {resi.adjustments.map((adj) => (
                  <div key={adj.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{adj.reason}</span>
                    <span className={cn("font-mono", adj.amount >= 0 ? "text-stempel" : "text-emerald-600")}>
                      {adj.amount >= 0 ? "+" : ""}
                      Rp{adj.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Row label="Total Tagihan" value={`Rp${resi.totalTagihan.toLocaleString("id-ID")}`} bold mono />
            {resi.isCod && (
              <Row label="Nilai COD" value={`Rp${resi.nilaiCod?.toLocaleString("id-ID")}`} mono />
            )}
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                Alamat Penerima
              </span>
              <span className="text-right">{resi.recipientAddress}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="size-4 text-muted-foreground" />
              Pemegang Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {custody?.currentHolder ? (
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terpal/10 text-terpal">
                  {(() => {
                    const Icon = EVENT_ICONS[custody.currentHolder.eventType] ?? CircleDot;
                    return <Icon className="size-4.5" />;
                  })()}
                </div>
                <div>
                  <Badge>{custody.currentHolder.eventType}</Badge>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Di: {custody.currentHolder.toEntityLabel ?? "-"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada event kustodi.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Riwayat Kustodi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!custody || custody.history.length === 0 ? (
            <EmptyState icon={History} title="Belum ada riwayat" description="Event kustodi akan muncul di sini." />
          ) : (
            <ol className="flex flex-col gap-4">
              {custody.history.map((h, i) => {
                const Icon = EVENT_ICONS[h.eventType] ?? CircleDot;
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terpal/10 text-terpal">
                        <Icon className="size-4" />
                      </div>
                      {i < custody.history.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium">{h.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.timestamp).toLocaleString("id-ID")}{" "}
                        {h.toEntityLabel ? `→ ${h.toEntityLabel}` : ""}
                      </p>
                      {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && "font-semibold", mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  );
}
