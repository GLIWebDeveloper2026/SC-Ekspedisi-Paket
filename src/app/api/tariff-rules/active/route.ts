import { NextResponse } from "next/server";
import { ServiceType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async (req) => {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const serviceTypeParam = searchParams.get("serviceType");
  const dateParam = searchParams.get("date");

  if (!serviceTypeParam || !Object.values(ServiceType).includes(serviceTypeParam as ServiceType)) {
    throw new ApiError("VALIDATION_ERROR", "Query param serviceType wajib diisi & valid", 400);
  }
  const date = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ApiError("VALIDATION_ERROR", "Query param date tidak valid", 400);
  }

  const tariffRule = await prisma.tariffRule.findFirst({
    where: {
      serviceType: serviceTypeParam as ServiceType,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: { zoneSurcharges: { include: { district: true } } },
  });

  if (!tariffRule) {
    throw new ApiError(
      "NOT_FOUND",
      `Tidak ada TariffRule aktif untuk ${serviceTypeParam} pada ${date.toISOString()}`,
      404,
    );
  }

  return NextResponse.json({
    id: tariffRule.id,
    serviceType: tariffRule.serviceType,
    ratePerKg: Number(tariffRule.ratePerKg),
    volumetricDivisor: Number(tariffRule.volumetricDivisor),
    effectiveFrom: tariffRule.effectiveFrom,
    effectiveTo: tariffRule.effectiveTo,
    zoneSurcharges: tariffRule.zoneSurcharges.map((z) => ({
      districtId: z.districtId,
      districtName: z.district.name,
      surchargeAmount: Number(z.surchargeAmount),
    })),
  });
});
