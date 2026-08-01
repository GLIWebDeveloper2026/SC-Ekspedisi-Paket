"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { countPending } from "./offlineQueue";
import { syncAllPending } from "./syncManager";

/**
 * Deteksi online/offline + sinkron otomatis antrian Dexie begitu koneksi kembali.
 * Ini jalan selama tab/app terbuka (event 'online') — bukan Background Sync API
 * penuh (dukungan browser tidak merata, khususnya Safari/iOS), tapi memenuhi
 * kebutuhan fungsional "begitu online, data otomatis terkirim tanpa refresh manual".
 */
export function useOnlineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await countPending());
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const { synced, failed } = await syncAllPending();
      if (synced > 0) {
        toast.success(`${synced} data berhasil disinkron ke server`);
      }
      if (failed > 0) {
        toast.error(`${failed} data gagal disinkron, akan dicoba lagi`);
      }
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, pendingCount, isSyncing, syncNow, refreshPendingCount };
}
