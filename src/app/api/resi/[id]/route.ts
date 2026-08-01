import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async (_req, ctx) => {
  await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const resi = await prisma.resi.findUnique({
    where: { id },
    include: {
      originAgent: { include: { district: true } },
      tariffRule: true,
      codCollection: true,
      deliveryAttempts: { orderBy: { attemptNumber: "asc" } },
      adjustments: { orderBy: { createdAt: "asc" } },
      returns: { orderBy: { initiatedAt: "asc" } },
    },
  });

  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  return NextResponse.json({
    ...resi,
    beratAktualKg: Number(resi.beratAktualKg),
    panjangCm: Number(resi.panjangCm),
    lebarCm: Number(resi.lebarCm),
    tinggiCm: Number(resi.tinggiCm),
    beratTertagihKg: Number(resi.beratTertagihKg),
    biayaDasar: Number(resi.biayaDasar),
    biayaZona: Number(resi.biayaZona),
    totalOngkir: Number(resi.totalOngkir),
    nilaiCod: resi.nilaiCod ? Number(resi.nilaiCod) : null,
  });
});
