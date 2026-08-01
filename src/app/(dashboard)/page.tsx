import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { prisma } from "@/lib/db";
import { RemitStatus, CustodyEventType } from "@prisma/client";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";
import { isEligibleForReturn } from "@/lib/business/checkRetur";

const STATUS_LABELS: Record<CustodyEventType, string> = {
  DIBUAT_DI_LOKET: "Di Loket",
  MASUK_KARUNG: "Di Karung",
  KELUAR_KARUNG: "Keluar Karung",
  MASUK_GUDANG: "Di Gudang",
  KELUAR_GUDANG: "Keluar Gudang",
  DISERAHKAN_KE_KURIR: "Bersama Kurir",
  DIOPER_KE_KURIR_LAIN: "Dioper Kurir Lain",
  DELIVERY_ATTEMPT: "Percobaan Antar",
  TERKIRIM: "Terkirim",
  RETUR_KE_GUDANG: "Retur ke Gudang",
  RETUR_KE_PENGIRIM: "Retur ke Pengirim",
};

export default async function DashboardHomePage() {
  const now = new Date();

  // Query sequentially (not Promise.all) — DATABASE_URL pins connection_limit=1
  // via the Supabase pgbouncer pooler, so concurrent queries would contend for
  // the single connection and time out.
  const resiCount = await prisma.resi.count();
  const sackCount = await prisma.sack.count();
  const codDiscrepancyCount = await prisma.codCollection.count({
    where: { remitStatus: RemitStatus.DISCREPANCY },
  });
  const returnCount = await prisma.return.count();

  const recentResi = await prisma.resi.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { custodyEvents: true, codCollection: { select: { remitStatus: true } } },
  });
  const districts = await prisma.district.findMany({ select: { id: true, name: true } });
  const districtNameById = new Map(districts.map((d) => [d.id, d.name]));

  const pendingReturnCandidates = await prisma.resi.findMany({
    where: { returns: { none: {} } },
    include: { custodyEvents: true },
  });
  const pendingReturnCount = pendingReturnCandidates.filter(
    (r) =>
      isEligibleForReturn(r.createdAt, now) &&
      resolveLastCustody(r.custodyEvents)?.eventType !== CustodyEventType.TERKIRIM,
  ).length;

  const stats = [
    { label: "Total Resi", value: resiCount, alert: false },
    { label: "Total Karung", value: sackCount, alert: false },
    { label: "Diskrepansi Setoran COD", value: codDiscrepancyCount, alert: codDiscrepancyCount > 0 },
    { label: "Kandidat Retur (>7 hari)", value: pendingReturnCount, alert: pendingReturnCount > 0 },
    { label: "Total Retur", value: returnCount, alert: false },
  ];

  const resiRows = recentResi.map((r) => {
    const lastEvent = resolveLastCustody(r.custodyEvents);
    const perluPerhatian =
      r.codCollection?.remitStatus === RemitStatus.DISCREPANCY ||
      (isEligibleForReturn(r.createdAt, now) && lastEvent?.eventType !== CustodyEventType.TERKIRIM);

    return {
      id: r.id,
      noResi: r.noResi,
      tujuan: districtNameById.get(r.destinationDistrictId) ?? "-",
      beratKg: Number(r.beratTertagihKg),
      ongkir: Number(r.totalOngkir),
      status: lastEvent ? STATUS_LABELS[lastEvent.eventType] : "Belum ada event",
      perluPerhatian,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan operasional Kilat Nusantara</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle
                className={`font-mono text-3xl tabular-nums ${s.alert ? "text-stempel" : ""}`}
              >
                {s.value}
              </CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Resi</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Berat</TableHead>
                <TableHead>Ongkir</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resiRows.map((r) => (
                <TableRow key={r.id} className={r.perluPerhatian ? "bg-stempel/5" : undefined}>
                  <TableCell>
                    <Link href={`/resi/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.noResi}
                    </Link>
                  </TableCell>
                  <TableCell>{r.tujuan}</TableCell>
                  <TableCell className="font-mono tabular-nums">{r.beratKg} kg</TableCell>
                  <TableCell>
                    <Money amount={r.ongkir} />
                  </TableCell>
                  <TableCell>
                    {r.perluPerhatian ? (
                      <Badge variant="destructive">{r.status}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{r.status}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {resiRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada resi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
