import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { RemitStatus } from "@prisma/client";

export default async function DashboardHomePage() {
  // Query sequentially (not Promise.all) — DATABASE_URL pins connection_limit=1
  // via the Supabase pgbouncer pooler, so concurrent queries would contend for
  // the single connection and time out.
  const resiCount = await prisma.resi.count();
  const sackCount = await prisma.sack.count();
  const codDiscrepancyCount = await prisma.codCollection.count({
    where: { remitStatus: RemitStatus.DISCREPANCY },
  });
  const returnCount = await prisma.return.count();

  const stats = [
    { label: "Total Resi", value: resiCount, alert: false },
    { label: "Total Karung", value: sackCount, alert: false },
    { label: "Diskrepansi Setoran COD", value: codDiscrepancyCount, alert: codDiscrepancyCount > 0 },
    { label: "Total Retur", value: returnCount, alert: false },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan operasional Kilat Nusantara</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
