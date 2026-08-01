"use client";

import { useEffect, useState } from "react";
import { listPendingCodRemits, listPendingDeliveryAttempts } from "@/lib/offline/offlineQueue";
import { useOnlineSync } from "@/lib/offline/use-online-sync";
import type { PendingCodRemit, PendingDeliveryAttempt } from "@/lib/offline/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function KurirRiwayatPage() {
  const { isOnline, isSyncing, syncNow } = useOnlineSync();
  const [attempts, setAttempts] = useState<PendingDeliveryAttempt[]>([]);
  const [remits, setRemits] = useState<PendingCodRemit[]>([]);

  async function refresh() {
    setAttempts(await listPendingDeliveryAttempts());
    setRemits(await listPendingCodRemits());
  }

  useEffect(() => {
    refresh();
  }, [isSyncing]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Antrian tersimpan lokal</p>
        <Button size="sm" variant="outline" disabled={!isOnline || isSyncing} onClick={() => syncNow()}>
          {isSyncing ? "Menyinkron..." : "Sinkron Sekarang"}
        </Button>
      </div>

      {attempts.map((a) => (
        <Card key={`attempt-${a.id}`}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-heading text-base">{a.noResi || a.resiId}</CardTitle>
            <Badge variant="secondary">Menunggu sinkron</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {a.result} — {new Date(a.createdAt).toLocaleString("id-ID")}
          </CardContent>
        </Card>
      ))}

      {remits.map((r) => (
        <Card key={`remit-${r.id}`}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-heading text-base">{r.noResi || r.resiId}</CardTitle>
            <Badge variant="secondary">Menunggu sinkron</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Setoran Rp{r.remitAmount.toLocaleString("id-ID")} —{" "}
            {new Date(r.createdAt).toLocaleString("id-ID")}
          </CardContent>
        </Card>
      ))}

      {attempts.length === 0 && remits.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Tidak ada antrian. Semua tersinkron.</p>
      )}
    </div>
  );
}
