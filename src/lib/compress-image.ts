const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

/**
 * Foto langsung dari kamera HP kurir sering >4-8MB — di atas batas payload
 * Vercel Serverless Function (4,5MB), jadi request-nya gagal SEBELUM sempat
 * menyentuh handler API sama sekali. Kegagalan ini lalu ketutup sama fallback
 * antrean offline (lihat lapor/[id]/page.tsx), jadi kelihatannya "tersimpan
 * lokal" padahal sebenarnya gagal terus tiap kali disinkron — bukan soal
 * sinyal. Downscale + re-encode ke JPEG di sini sebelum dikirim/diantre.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Browser tidak dukung createImageBitmap/canvas.toBlob, atau file korup
    // — kirim apa adanya, biar server yang tolak kalau memang tidak valid.
    return file;
  }
}
