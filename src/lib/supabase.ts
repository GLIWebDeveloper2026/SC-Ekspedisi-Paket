import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "bukti-pengiriman";

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Upload bukti foto delivery attempt ke Supabase Storage. Kalau Supabase belum
 * dikonfigurasi (SUPABASE_URL/SUPABASE_ANON_KEY kosong), fallback: kembalikan null
 * supaya caller bisa fallback ke field teks "keterangan bukti" (lihat 02-ARSITEKTUR.md).
 */
export async function uploadProofPhoto(file: File): Promise<string | null> {
  if (!supabase) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Gagal upload bukti foto ke Supabase Storage:", error.message);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
