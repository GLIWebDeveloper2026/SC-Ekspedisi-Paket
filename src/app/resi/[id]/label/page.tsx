"use client";

import { use } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface District {
  id: string;
  name: string;
}

interface ResiLabelData {
  noResi: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientAddress: string;
  destinationDistrictId: string;
  serviceType: string;
  beratTertagihKg: number;
  isCod: boolean;
  nilaiCod: number | null;
  createdAt: string;
  originAgent: { name: string; district: { name: string } };
}

export default function ResiLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: resi, isLoading } = useQuery({
    queryKey: ["resi-label", id],
    queryFn: () => apiFetch<ResiLabelData>(`/api/resi/${id}`),
  });
  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => apiFetch<{ data: District[] }>("/api/districts"),
  });

  const tujuanKecamatan = districts?.data.find((d) => d.id === resi?.destinationDistrictId)?.name;

  if (isLoading || !resi) {
    return <p className="p-6 text-sm text-muted-foreground">Memuat...</p>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-muted/40 py-8 print:bg-white print:py-0">
      <Button onClick={() => window.print()} className="gap-1.5 print:hidden">
        <Printer className="size-4" />
        Cetak Label
      </Button>

      <div className="w-[380px] rounded-lg border-2 border-dashed border-foreground/30 bg-white p-5 text-black print:w-full print:rounded-none print:border-solid">
        <div className="mb-3 flex items-center justify-between border-b-2 border-black pb-2">
          <Image src="/logo-wordmark.png" alt="Kilat Nusantara" width={140} height={49} />
          <span className="rounded border border-black px-1.5 py-0.5 text-xs font-bold">
            {resi.serviceType}
          </span>
        </div>

        <div className="mb-3 text-center">
          <p className="font-mono text-2xl font-bold tracking-wider">{resi.noResi}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(resi.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="mb-3 border-y border-dashed border-black py-2 text-sm">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Dari</p>
          <p className="font-medium">{resi.senderName}</p>
          <p className="text-xs">{resi.originAgent?.name} — {resi.originAgent?.district?.name}</p>
        </div>

        <div className="mb-3 text-sm">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Kepada</p>
          <p className="text-base font-bold">{resi.recipientName}</p>
          <p>{resi.recipientAddress}</p>
          <p className="font-medium">Kec. {tujuanKecamatan ?? "-"}</p>
        </div>

        <div className="flex items-center justify-between border-t-2 border-black pt-2 text-sm">
          <span>Berat: <span className="font-mono font-semibold">{resi.beratTertagihKg} kg</span></span>
          {resi.isCod && (
            <span className="rounded bg-black px-2 py-0.5 text-xs font-bold text-white">
              COD Rp{resi.nilaiCod?.toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
