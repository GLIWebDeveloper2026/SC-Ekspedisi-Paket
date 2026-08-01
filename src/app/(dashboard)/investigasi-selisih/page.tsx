"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchCheck, Boxes, Truck, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SackDiscrepancy {
  sackId: string;
  originInfo: string;
  destinationInfo: string;
  expectedCount: number;
  arrivedCount: number;
  missingResi: {
    resiId: string;
    noResi: string | null;
    pemegangTerakhir: string;
    waktuTerakhirTercatat: string | null;
  }[];
}
interface DiscrepanciesResponse {
  sackDiscrepancies: SackDiscrepancy[];
}
interface KurirDiscrepancy {
  kurirId: string;
  kurirName: string;
  belumSelesai: {
    resiId: string;
    noResi: string | null;
    pemegangTerakhir: string;
    waktuTerakhirTercatat: string | null;
  }[];
}

export default function InvestigasiSelisihPage() {
  const { data: sackData, isLoading: sackLoading } = useQuery({
    queryKey: ["report-discrepancies"],
    queryFn: () => apiFetch<DiscrepanciesResponse>("/api/reports/discrepancies"),
  });
  const { data: kurirData, isLoading: kurirLoading } = useQuery({
    queryKey: ["kurir-assignment-discrepancies"],
    queryFn: () => apiFetch<{ data: KurirDiscrepancy[] }>("/api/reports/kurir-assignment-discrepancies"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={SearchCheck}
        title="Investigasi Selisih"
        description="Bukti klik-dan-lihat: siapa pemegang terakhir paket yang hilang, di leg agen→gudang maupun gudang→penerima."
      />

      <Tabs defaultValue="karung">
        <TabsList>
          <TabsTrigger value="karung" className="gap-1.5">
            <Boxes className="size-3.5" />
            Selisih Karung
          </TabsTrigger>
          <TabsTrigger value="kurir" className="gap-1.5">
            <Truck className="size-3.5" />
            Laporan Kurir Belum Masuk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="karung">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="size-4 text-muted-foreground" />
                Selisih Karung (Agen → Gudang)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sackLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
              {sackData && sackData.sackDiscrepancies.length === 0 && (
                <EmptyState icon={Boxes} title="Tidak ada selisih karung" description="Semua karung yang dikirim sudah lengkap sampai gudang." />
              )}
              {sackData?.sackDiscrepancies.map((s) => (
                <div key={s.sackId} className="mb-4 rounded-lg border border-stempel/30 bg-stempel/5 p-3 last:mb-0">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-stempel">
                    <AlertTriangle className="size-3.5" />
                    {s.originInfo} → {s.destinationInfo} · {s.arrivedCount}/{s.expectedCount} tercatat masuk
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No Resi</TableHead>
                        <TableHead>Pemegang Terakhir</TableHead>
                        <TableHead>Waktu Terakhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.missingResi.map((m) => (
                        <TableRow key={m.resiId}>
                          <TableCell className="font-mono">{m.noResi ?? m.resiId}</TableCell>
                          <TableCell className="font-medium">{m.pemegangTerakhir}</TableCell>
                          <TableCell>
                            {m.waktuTerakhirTercatat
                              ? new Date(m.waktuTerakhirTercatat).toLocaleString("id-ID")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kurir">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" />
                Laporan Kurir Belum Masuk (Gudang → Penerima)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kurirLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
              {kurirData && kurirData.data.length === 0 && (
                <EmptyState icon={Truck} title="Tidak ada selisih" description="Semua resi yang ditugaskan ke kurir sudah ada laporan hasilnya." />
              )}
              {kurirData?.data.map((k) => (
                <div key={k.kurirId} className="mb-4 rounded-lg border border-stempel/30 bg-stempel/5 p-3 last:mb-0">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-stempel">
                    <AlertTriangle className="size-3.5" />
                    {k.kurirName} · {k.belumSelesai.length} resi belum ada laporan
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No Resi</TableHead>
                        <TableHead>Ditugaskan Sejak</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {k.belumSelesai.map((b) => (
                        <TableRow key={b.resiId}>
                          <TableCell className="font-mono">{b.noResi ?? b.resiId}</TableCell>
                          <TableCell>
                            {b.waktuTerakhirTercatat
                              ? new Date(b.waktuTerakhirTercatat).toLocaleString("id-ID")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
