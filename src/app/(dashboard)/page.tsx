import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { RemitStatus } from "@prisma/client";

export default async function DashboardHomePage() {
  const [resiCount, sackCount, codDiscrepancyCount, returnCount] = await Promise.all([
    prisma.resi.count(),
    prisma.sack.count(),
    prisma.codCollection.count({ where: { remitStatus: RemitStatus.DISCREPANCY } }),
    prisma.return.count(),
  ]);

  const stats = [
    { label: "Total Resi", value: resiCount },
    { label: "Total Karung", value: sackCount },
    { label: "Diskrepansi Setoran COD", value: codDiscrepancyCount },
    { label: "Total Retur", value: returnCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan operasional Kilat Nusantara</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}
