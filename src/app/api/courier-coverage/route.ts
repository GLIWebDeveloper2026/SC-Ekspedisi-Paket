import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/** Wilayah kecamatan yang di-cover 1 kurir (many-to-many). */
export const GET = withApiErrorHandling(async (req) => {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const courierId = searchParams.get("courierId");
  if (!courierId) {
    throw new ApiError("VALIDATION_ERROR", "courierId wajib diisi", 400);
  }

  const coverage = await prisma.courierDistrictCoverage.findMany({
    where: { courierId },
    select: { districtId: true },
  });
  return NextResponse.json({ data: coverage.map((c) => c.districtId) });
});

const setCoverageSchema = z.object({
  courierId: z.string().min(1),
  districtIds: z.array(z.string()),
});

/** Ganti seluruh set wilayah cover kurir ini (bukan tambah satu-satu). */
export const PUT = withApiErrorHandling(async (req) => {
  await requireAuth([Role.OWNER]);

  const body = await req.json();
  const parsed = setCoverageSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const { courierId, districtIds } = parsed.data;

  const kurir = await prisma.user.findUnique({ where: { id: courierId } });
  if (!kurir || kurir.role !== Role.KURIR) {
    throw new ApiError("VALIDATION_ERROR", "courierId harus kurir", 400);
  }

  await prisma.$transaction([
    prisma.courierDistrictCoverage.deleteMany({ where: { courierId } }),
    prisma.courierDistrictCoverage.createMany({
      data: districtIds.map((districtId) => ({ courierId, districtId })),
    }),
  ]);

  return NextResponse.json({ courierId, districtIds });
});
