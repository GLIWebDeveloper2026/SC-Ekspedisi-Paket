"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineSync } from "@/lib/offline/use-online-sync";
import { cn } from "@/lib/utils";

export function SyncBadge() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOnlineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => syncNow()}
      disabled={!isOnline || isSyncing}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium",
        isOnline ? "bg-lampu-natrium/20 text-lampu-natrium" : "bg-stempel/20 text-stempel",
      )}
    >
      {!isOnline && (
        <>
          <WifiOff className="size-3.5" />
          <span>Offline — data tersimpan lokal</span>
        </>
      )}
      {isOnline && pendingCount > 0 && (
        <>
          <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
          <span>
            {isSyncing ? "Menyinkron..." : `${pendingCount} data menunggu sinkron — ketuk untuk sinkron`}
          </span>
        </>
      )}
    </button>
  );
}
