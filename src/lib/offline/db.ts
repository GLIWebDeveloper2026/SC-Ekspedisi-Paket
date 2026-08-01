import Dexie, { type Table } from "dexie";

export interface PendingDeliveryAttempt {
  id?: number;
  resiId: string;
  noResi: string;
  courierId: string;
  result: "BERHASIL" | "GAGAL" | "DITITIP_PIHAK_KETIGA";
  recipientName?: string;
  thirdPartyFlag: boolean;
  thirdPartyName?: string;
  evidenceNote?: string;
  proofPhoto?: File | null;
  createdAt: number;
}

export interface PendingCodRemit {
  id?: number;
  resiId: string;
  noResi: string;
  remitAmount: number;
  createdAt: number;
}

/** Antrian offline untuk 2 aksi paling kritis kurir (lihat docs/09-PWA-KURIR.md). */
class OfflineDb extends Dexie {
  deliveryAttempts!: Table<PendingDeliveryAttempt, number>;
  codRemits!: Table<PendingCodRemit, number>;

  constructor() {
    super("kilat-nusantara-offline");
    this.version(1).stores({
      deliveryAttempts: "++id, resiId, createdAt",
      codRemits: "++id, resiId, createdAt",
    });
  }
}

export const offlineDb = new OfflineDb();
