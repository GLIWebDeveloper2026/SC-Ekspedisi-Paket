import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceType } from "@prisma/client";

import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveOngkirForResi } from "@/lib/resolve-ongkir";

const previewSchema = z.object({
  destinationDistrictId: z.string().min(1),
  serviceType: z.enum(ServiceType),
  beratAktualKg: z.number().positive("Berat harus lebih dari 0"),
  panjangCm: z.number().positive(),
  lebarCm: z.number().positive(),
  tinggiCm: z.number().positive(),
});

/**
 * Hitung ongkir TANPA menyimpan apa pun — dipakai form "Buat Resi" untuk
 * menampilkan preview sebelum submit, pakai logika & tarif aktif yang persis
 * sama dengan POST /api/resi (lewat resolveOngkirForResi() bersama).
 */
export const POST = withApiErrorHandling(async (req) => {
  await requireAuth();

  const body = await req.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const { hasil } = await resolveOngkirForResi(parsed.data);

  return NextResponse.json({
    beratTertagihKg: hasil.beratTertagihKg,
    biayaDasar: hasil.biayaDasar,
    biayaZona: hasil.biayaZona,
    totalOngkir: hasil.total,
  });
});
