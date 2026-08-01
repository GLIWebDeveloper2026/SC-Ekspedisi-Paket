"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Boxes, Wallet, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { matchesSearch } from "@/lib/filter-utils";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSearch } from "@/components/table-search";
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

  const [sackSearch, setSackSearch] = useState("");
  const [codSearch, setCodSearch] = useState("");
  const [returnSearch, setReturnSearch] = useState("");

  const filteredSackDiscrepancies = useMemo(
    () =>
      (discrepancies?.sackDiscrepancies ?? []).filter((s) =>
        matchesSearch(sackSearch, s.originInfo, s.destinationInfo),
      ),
    [discrepancies, sackSearch],
  );
  const filteredCodDiscrepancies = useMemo(
    () =>
      (discrepancies?.codDiscrepancies ?? []).filter((c) =>
        matchesSearch(codSearch, c.noResi, c.courierName),
      ),
    [discrepancies, codSearch],
  );
  const filteredPendingReturns = useMemo(
    () => (pendingReturns?.data ?? []).filter((r) => matchesSearch(returnSearch, r.noResi)),
    [pendingReturns, returnSearch],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={BarChart3}
        title="Laporan"
        description="Diskrepansi sack/COD & kandidat retur (>7 hari)"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-muted-foreground" />
            Diskrepansi Karung (Jumlah Tidak Cocok)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDiscrepancies && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {discrepancies && discrepancies.sackDiscrepancies.length === 0 && (
            <EmptyState icon={Boxes} title="Tidak ada diskrepansi karung" />
          )}
          {discrepancies && discrepancies.sackDiscrepancies.length > 0 && (
            <>
              <TableSearch value={sackSearch} onChange={setSackSearch} placeholder="Cari asal atau tujuan..." />
              {filteredSackDiscrepancies.length === 0 ? (
                <EmptyState icon={Boxes} title="Tidak ada hasil" description="Coba ubah kata kunci pencarian." />
              ) : (
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
                    {filteredSackDiscrepancies.map((s) => (
                      <TableRow key={s.sackId}>
                        <TableCell>{s.originInfo}</TableCell>
                        <TableCell>{s.destinationInfo}</TableCell>
                        <TableCell className="font-mono tabular-nums">{s.expectedCount}</TableCell>
                        <TableCell className="font-mono tabular-nums">{s.arrivedCount}</TableCell>
                        <TableCell>{s.missingResi.map((r) => r.noResi).join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            Diskrepansi Setoran COD
          </CardTitle>
        </CardHeader>
        <CardContent>
          {discrepancies && discrepancies.codDiscrepancies.length === 0 && (
            <EmptyState icon={Wallet} title="Tidak ada diskrepansi setoran COD" />
          )}
          {discrepancies && discrepancies.codDiscrepancies.length > 0 && (
            <>
              <TableSearch value={codSearch} onChange={setCodSearch} placeholder="Cari no resi atau kurir..." />
              {filteredCodDiscrepancies.length === 0 ? (
                <EmptyState icon={Wallet} title="Tidak ada hasil" description="Coba ubah kata kunci pencarian." />
              ) : (
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
                    {filteredCodDiscrepancies.map((c) => (
                      <TableRow key={c.resiId}>
                        <TableCell>{c.noResi}</TableCell>
                        <TableCell>{c.courierName}</TableCell>
                        <TableCell>
                          <Money amount={c.expectedRemit} />
                        </TableCell>
                        <TableCell>{c.remitAmount !== null ? <Money amount={c.remitAmount} /> : "-"}</TableCell>
                        <TableCell className="text-stempel">
                          {c.discrepancyAmount !== null ? <Money amount={c.discrepancyAmount} /> : "-"}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            Kandidat Retur (&gt;7 hari)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPending && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {pendingReturns && pendingReturns.data.length === 0 && (
            <EmptyState icon={Clock} title="Tidak ada kandidat retur" />
          )}
          {pendingReturns && pendingReturns.data.length > 0 && (
            <>
              <TableSearch value={returnSearch} onChange={setReturnSearch} placeholder="Cari no resi..." />
              {filteredPendingReturns.length === 0 ? (
                <EmptyState icon={Clock} title="Tidak ada hasil" description="Coba ubah kata kunci pencarian." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No Resi</TableHead>
                      <TableHead>Hari Sejak Dibuat</TableHead>
                      <TableHead>Pemegang Terakhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingReturns.map((r) => (
                      <TableRow key={r.resiId}>
                        <TableCell>{r.noResi}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{r.daysSinceCreated} hari</Badge>
                        </TableCell>
                        <TableCell>{r.lastHolder?.eventType ?? "-"}</TableCell>
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
