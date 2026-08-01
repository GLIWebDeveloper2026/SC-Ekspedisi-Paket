"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, PackageCheck, Circle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface RiwayatItem {
  label: string;
  waktu: string;
}
interface TrackResult {
  noResi: string;
  tujuanKecamatan: string | null;
  estimasiLayanan: string;
  riwayat: RiwayatItem[];
  sudahTerkirim: boolean;
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrackPage() {
  const [noResi, setNoResi] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!noResi.trim()) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const data = await apiFetch<TrackResult>(`/api/track/${encodeURIComponent(noResi.trim())}`);
      setResult(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-lampu-natrium/15">
            <Image src="/logo-bolt.png" alt="" width={20} height={20} />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold">Lacak Paket</h1>
            <p className="text-xs text-muted-foreground">Kilat Nusantara</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <Input
            value={noResi}
            onChange={(e) => setNoResi(e.target.value)}
            placeholder="cth. KN-20260801-0001-X7K2"
            className="flex-1 font-mono"
          />
          <Button type="submit" disabled={loading} aria-label="Cari">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </form>

        {loading && (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <div className="mt-2 flex flex-col gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && notFound && (
          <Card className="border-stempel/30 bg-stempel/5">
            <CardContent className="py-4 text-sm text-stempel">
              Nomor resi tidak ditemukan. Periksa kembali penulisannya.
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardContent className="pt-6">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-sm font-medium tracking-wide">{result.noResi}</span>
                {result.sudahTerkirim && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1F7A4C]">
                    <PackageCheck className="size-3.5" />
                    Terkirim
                  </span>
                )}
              </div>
              <p className="mb-5 text-xs text-muted-foreground">
                Tujuan: {result.tujuanKecamatan ?? "-"} · Layanan: {result.estimasiLayanan}
              </p>

              {result.riwayat.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada riwayat perjalanan.</p>
              ) : (
                <ol>
                  {result.riwayat
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <li key={idx} className="relative pb-5 pl-6 last:pb-0">
                        {idx !== result.riwayat.length - 1 && (
                          <span
                            className="absolute top-3 bottom-0 left-1.25 w-px bg-border"
                            aria-hidden="true"
                          />
                        )}
                        <Circle
                          className={`absolute top-1 left-0 size-2.5 ${
                            idx === 0 ? "fill-terpal text-terpal" : "fill-muted-foreground/30 text-muted-foreground/30"
                          }`}
                          aria-hidden="true"
                        />
                        <p className={`text-sm ${idx === 0 ? "font-medium" : "text-muted-foreground"}`}>
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/70">{formatTanggal(item.waktu)}</p>
                      </li>
                    ))}
                </ol>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
