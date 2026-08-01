import Dexie, { type Table } from "dexie";

export interface PendingDeliveryAttempt {
  id?: number;
  resiId: string;
  noResi: string;
  /**
   * User.id (role KURIR) yang membuat laporan ini — diambil dari sesi AKTIF SAAT
   * item ini dibuat, dan tidak pernah dibaca ulang dari sesi saat sinkron terjadi.
   * Ini penting kalau HP kurir adalah device pinjaman kantor yang dipakai
   * bergantian: kalau Kurir A logout lalu Kurir B login sebelum antrian Kurir A
   * sempat tersinkron, laporan itu tetap terkirim atas nama Kurir A (lihat
   * docs/09-PWA-KURIR.md §3.1). Endpoint /api/delivery-attempts memvalidasi id
   * ini sebagai User aktif ber-role KURIR, bukan berdasar sesi request saat itu.
   */
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
