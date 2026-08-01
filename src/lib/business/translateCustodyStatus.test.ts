import { describe, it, expect } from "vitest";
import { translateCustodyStatus } from "./translateCustodyStatus";

describe("translateCustodyStatus", () => {
  it("menerjemahkan event biasa ke bahasa customer", () => {
    expect(translateCustodyStatus("DIBUAT_DI_LOKET")).toBe("Paket diterima di agen pengiriman");
    expect(translateCustodyStatus("MASUK_GUDANG")).toBe("Paket tiba di gudang transit");
    expect(translateCustodyStatus("TERKIRIM")).toBe("Paket telah diterima");
  });

  it("menyembunyikan MASUK_KARUNG (terlalu teknis untuk publik)", () => {
    expect(translateCustodyStatus("MASUK_KARUNG")).toBeNull();
  });

  it("DELIVERY_ATTEMPT diterjemahkan sesuai deliveryResult-nya", () => {
    expect(translateCustodyStatus("DELIVERY_ATTEMPT", "GAGAL")).toBe(
      "Percobaan pengantaran belum berhasil, akan dicoba kembali",
    );
    expect(translateCustodyStatus("DELIVERY_ATTEMPT", "DITITIP_PIHAK_KETIGA")).toBe(
      "Paket diterima di alamat tujuan",
    );
  });

  it("DELIVERY_ATTEMPT dengan hasil BERHASIL disembunyikan (event TERKIRIM terpisah yang mewakilinya)", () => {
    expect(translateCustodyStatus("DELIVERY_ATTEMPT", "BERHASIL")).toBeNull();
  });

  it("DIOPER_KE_KURIR_LAIN tetap tampil sebagai 'sedang dalam pengantaran', tidak bocorkan detail teknis", () => {
    expect(translateCustodyStatus("DIOPER_KE_KURIR_LAIN")).toBe("Paket sedang dalam pengantaran");
  });

  it("fallback ke pesan generik untuk eventType yang tidak dikenal", () => {
    expect(translateCustodyStatus("SESUATU_YANG_BARU")).toBe("Status diperbarui");
  });
});
