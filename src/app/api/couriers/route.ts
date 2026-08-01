import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/**
 * Kurir adalah User biasa dengan role KURIR, bukan tabel Courier terpisah.
 * `?districtId=` menyaring ke kurir yang meng-cover kecamatan itu (lewat
 * CourierDistrictCoverage) — dipakai dropdown assign-kurir supaya Kepala
 * Gudang tidak perlu ingat manual siapa pegang wilayah mana.
 */
export const GET = withApiErrorHandling(async (req) => {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const districtId = searchParams.get("districtId");

  const couriers = await prisma.user.findMany({
    where: {
      role: Role.KURIR,
      isActive: true,
      ...(districtId ? { districtCoverage: { some: { districtId } } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: couriers });
});
