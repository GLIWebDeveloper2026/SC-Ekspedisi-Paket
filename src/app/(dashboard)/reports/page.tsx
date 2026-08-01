"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  missingResi: { resiId: string; noResi: string }[];
}
interface CodDiscrepancy {
  resiId: string;
  noResi: string;
  courierName: string;
  expectedRemit: number;
  remitAmount: number | null;
  discrepancyAmount: number | null;
}
interface DiscrepanciesResponse {
  sackDiscrepancies: SackDiscrepancy[];
  codDiscrepancies: CodDiscrepancy[];
}
interface PendingReturnItem {
  resiId: string;
  noResi: string;
  daysSinceCreated: number;
  lastHolder: { eventType: string; toEntity: string | null } | null;
}

export default function ReportsPage() {
  const { data: discrepancies, isLoading: loadingDiscrepancies } = useQuery({
    queryKey: ["report-discrepancies"],
    queryFn: () => apiFetch<DiscrepanciesResponse>("/api/reports/discrepancies"),
  });
  const { data: pendingReturns, isLoading: loadingPending } = useQuery({
    queryKey: ["report-pending-returns"],
    queryFn: () => apiFetch<{ data: PendingReturnItem[] }>("/api/reports/pending-returns"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Laporan</h1>
        <p className="text-muted-foreground">Diskrepansi sack/COD & kandidat retur (&gt;7 hari)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diskrepansi Karung (Jumlah Tidak Cocok)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDiscrepancies && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {discrepancies && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asal</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead>Diharapkan</TableHead>
                  <TableHead>Sudah Masuk Gudang</TableHead>
                  <TableHead>Resi Hilang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.sackDiscrepancies.map((s) => (
                  <TableRow key={s.sackId}>
                    <TableCell>{s.originInfo}</TableCell>
                    <TableCell>{s.destinationInfo}</TableCell>
                    <TableCell>{s.expectedCount}</TableCell>
                    <TableCell>{s.arrivedCount}</TableCell>
                    <TableCell>{s.missingResi.map((r) => r.noResi).join(", ")}</TableCell>
                  </TableRow>
                ))}
                {discrepancies.sackDiscrepancies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada diskrepansi karung.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diskrepansi Setoran COD</CardTitle>
        </CardHeader>
        <CardContent>
          {discrepancies && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Resi</TableHead>
                  <TableHead>Kurir</TableHead>
                  <TableHead>Setoran Wajib</TableHead>
                  <TableHead>Setoran Aktual</TableHead>
                  <TableHead>Selisih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.codDiscrepancies.map((c) => (
                  <TableRow key={c.resiId}>
                    <TableCell>{c.noResi}</TableCell>
                    <TableCell>{c.courierName}</TableCell>
                    <TableCell>Rp{c.expectedRemit.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{c.remitAmount ? `Rp${c.remitAmount.toLocaleString("id-ID")}` : "-"}</TableCell>
                    <TableCell className="text-destructive">
                      {c.discrepancyAmount ? `Rp${c.discrepancyAmount.toLocaleString("id-ID")}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {discrepancies.codDiscrepancies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada diskrepansi setoran COD.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kandidat Retur (&gt;7 hari)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPending && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {pendingReturns && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Resi</TableHead>
                  <TableHead>Hari Sejak Dibuat</TableHead>
                  <TableHead>Pemegang Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReturns.data.map((r) => (
                  <TableRow key={r.resiId}>
                    <TableCell>{r.noResi}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{r.daysSinceCreated} hari</Badge>
                    </TableCell>
                    <TableCell>{r.lastHolder?.eventType ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {pendingReturns.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Tidak ada kandidat retur.
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
