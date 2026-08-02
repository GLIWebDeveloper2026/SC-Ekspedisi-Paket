import { offlineDb } from "./db";
import { compressImage } from "../compress-image";

interface SyncResult {
  synced: number;
  failed: number;
}

/**
 * Kirim ulang antrian pending-sync ke API satu per satu, hapus dari Dexie kalau
 * sukses. Item yang gagal (mis. masih offline) dibiarkan di antrian untuk dicoba lagi.
 */
async function syncPendingDeliveryAttempts(): Promise<SyncResult> {
  const items = await offlineDb.deliveryAttempts.orderBy("createdAt").toArray();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const formData = new FormData();
      formData.set("resiId", item.resiId);
      formData.set("courierId", item.courierId);
      formData.set("result", item.result);
      if (item.recipientName) formData.set("recipientName", item.recipientName);
      formData.set("thirdPartyFlag", String(item.thirdPartyFlag));
      if (item.thirdPartyName) formData.set("thirdPartyName", item.thirdPartyName);
      if (item.evidenceNote) formData.set("evidenceNote", item.evidenceNote);
      // Kompres lagi di sini (idempotent, defensif) untuk antrean lama yang
      // sempat tersimpan sebelum kompresi dipasang di titik input.
      if (item.proofPhoto) formData.set("proofPhoto", await compressImage(item.proofPhoto));

      const res = await fetch("/api/delivery-attempts", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await offlineDb.deliveryAttempts.delete(item.id!);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

async function syncPendingCodRemits(): Promise<SyncResult> {
  const items = await offlineDb.codRemits.orderBy("createdAt").toArray();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(`/api/cod/${item.resiId}/remit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remitAmount: item.remitAmount }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await offlineDb.codRemits.delete(item.id!);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function syncAllPending(): Promise<SyncResult> {
  const [deliveryResult, codResult] = await Promise.all([
    syncPendingDeliveryAttempts(),
    syncPendingCodRemits(),
  ]);
  return {
    synced: deliveryResult.synced + codResult.synced,
    failed: deliveryResult.failed + codResult.failed,
  };
}
