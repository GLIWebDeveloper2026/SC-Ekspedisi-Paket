/**
 * Terjemahkan CustodyEventType internal ke bahasa customer untuk pelacakan
 * publik — istilah teknis (mis. "MASUK_KARUNG") tidak pernah ditampilkan
 * mentah ke luar. Lihat docs/14-PELACAKAN-PUBLIK.md.
 */
const LABEL_MAP: Record<string, string> = {
  DIBUAT_DI_LOKET: "Paket diterima di agen pengiriman",
  DIANGKUT_KE_GUDANG: "Paket dalam perjalanan menuju gudang transit",
  MASUK_GUDANG: "Paket tiba di gudang transit",
  KELUAR_GUDANG: "Paket telah disortir, siap diantar",
  DISERAHKAN_KE_KURIR: "Paket sedang dalam pengantaran",
  DIOPER_KE_KURIR_LAIN: "Paket sedang dalam pengantaran",
  TERKIRIM: "Paket telah diterima",
  RETUR_KE_GUDANG: "Pengantaran belum berhasil, paket kembali ke gudang",
  DIANGKUT_KEMBALI_KE_AGEN: "Paket dalam perjalanan retur ke agen asal",
  DITERIMA_DI_AGEN_ASAL: "Paket sampai di agen asal, siap diambil pengirim",
  RETUR_KE_PENGIRIM: "Paket dikembalikan ke pengirim",
};

// Terlalu teknis untuk customer, gabung diam-diam ke status sebelumnya.
const HIDDEN_EVENTS = new Set(["MASUK_KARUNG"]);

export function translateCustodyStatus(eventType: string, deliveryResult?: string): string | null {
  if (HIDDEN_EVENTS.has(eventType)) return null;

  if (eventType === "DELIVERY_ATTEMPT") {
    if (deliveryResult === "GAGAL") return "Percobaan pengantaran belum berhasil, akan dicoba kembali";
    if (deliveryResult === "DITITIP_PIHAK_KETIGA") return "Paket diterima di alamat tujuan";
    // BERHASIL: disembunyikan, event TERKIRIM terpisah yang mewakili status ini.
    if (deliveryResult === "BERHASIL") return null;
  }

  return LABEL_MAP[eventType] ?? "Status diperbarui";
}
