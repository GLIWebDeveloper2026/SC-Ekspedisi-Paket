"use client";

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
        "flex w-full items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium",
        isOnline ? "bg-lampu-natrium/20 text-lampu-natrium" : "bg-stempel/20 text-stempel",
      )}
    >
      {!isOnline && <span>Offline — data tersimpan lokal</span>}
      {isOnline && pendingCount > 0 && (
        <span>
          {isSyncing ? "Menyinkron..." : `${pendingCount} data menunggu sinkron — ketuk untuk sinkron`}
        </span>
      )}
    </button>
  );
}
