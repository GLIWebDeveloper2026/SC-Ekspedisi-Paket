"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Truck, Wallet, CheckCircle2 } from "lucide-react";
import { listPendingCodRemits, listPendingDeliveryAttempts } from "@/lib/offline/offlineQueue";
import { useOnlineSync } from "@/lib/offline/use-online-sync";
import type { PendingCodRemit, PendingDeliveryAttempt } from "@/lib/offline/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

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
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!isOnline || isSyncing}
          onClick={() => syncNow()}
        >
          <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
          {isSyncing ? "Menyinkron..." : "Sinkron Sekarang"}
        </Button>
      </div>

      {attempts.map((a) => (
        <Card key={`attempt-${a.id}`}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
              <Truck className="size-4 text-lampu-natrium" />
            </div>
            <CardTitle className="flex-1 font-mono text-sm tracking-wide">
              {a.noResi || a.resiId}
            </CardTitle>
            <Badge variant="secondary">Menunggu sinkron</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {a.result} — {new Date(a.createdAt).toLocaleString("id-ID")}
          </CardContent>
        </Card>
      ))}

      {remits.map((r) => (
        <Card key={`remit-${r.id}`}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
              <Wallet className="size-4 text-lampu-natrium" />
            </div>
            <CardTitle className="flex-1 font-mono text-sm tracking-wide">
              {r.noResi || r.resiId}
            </CardTitle>
            <Badge variant="secondary">Menunggu sinkron</Badge>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Setoran Rp{r.remitAmount.toLocaleString("id-ID")} —{" "}
            {new Date(r.createdAt).toLocaleString("id-ID")}
          </CardContent>
        </Card>
      ))}

      {attempts.length === 0 && remits.length === 0 && (
        <EmptyState icon={CheckCircle2} title="Semua tersinkron" description="Tidak ada antrian menunggu." />
      )}
    </div>
  );
}
