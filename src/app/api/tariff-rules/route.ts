import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ServiceType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createTariffRuleSchema = z.object({
  serviceType: z.enum(ServiceType),
  ratePerKg: z.number().positive(),
  volumetricDivisor: z.number().positive(),
  effectiveFrom: z.string().min(1),
  zoneSurcharges: z
    .array(z.object({ districtId: z.string().min(1), surchargeAmount: z.number().nonnegative() }))
    .optional(),
});

/**
 * Buat versi tarif baru. Tidak pernah UPDATE TariffRule lama — versi lama otomatis
 * ditutup (effectiveTo) supaya resi yang sudah dibuat tetap merujuk snapshot lamanya.
 */
export const POST = withApiErrorHandling(async (req) => {
  await requireAuth([Role.OWNER]);

  const body = await req.json();
  const parsed = createTariffRuleSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;
  const effectiveFrom = new Date(input.effectiveFrom);
  if (Number.isNaN(effectiveFrom.getTime())) {
    throw new ApiError("VALIDATION_ERROR", "effectiveFrom tidak valid", 400);
  }

  const newRule = await prisma.$transaction(async (tx) => {
    const currentActive = await tx.tariffRule.findFirst({
      where: { serviceType: input.serviceType, effectiveTo: null },
    });
    if (currentActive) {
      await tx.tariffRule.update({
        where: { id: currentActive.id },
        data: { effectiveTo: effectiveFrom },
      });
    }

    return tx.tariffRule.create({
      data: {
        serviceType: input.serviceType,
        ratePerKg: input.ratePerKg,
        volumetricDivisor: input.volumetricDivisor,
        effectiveFrom,
        zoneSurcharges: input.zoneSurcharges
          ? {
              create: input.zoneSurcharges.map((z) => ({
                districtId: z.districtId,
                surchargeAmount: z.surchargeAmount,
              })),
            }
          : undefined,
      },
      include: { zoneSurcharges: true },
    });
  });

  return NextResponse.json(
    {
      id: newRule.id,
      serviceType: newRule.serviceType,
      ratePerKg: Number(newRule.ratePerKg),
      volumetricDivisor: Number(newRule.volumetricDivisor),
      effectiveFrom: newRule.effectiveFrom,
      effectiveTo: newRule.effectiveTo,
    },
    { status: 201 },
  );
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const rules = await prisma.tariffRule.findMany({
    orderBy: [{ serviceType: "asc" }, { effectiveFrom: "desc" }],
  });

  return NextResponse.json({
    data: rules.map((r) => ({
      id: r.id,
      serviceType: r.serviceType,
      ratePerKg: Number(r.ratePerKg),
      volumetricDivisor: Number(r.volumetricDivisor),
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
    })),
  });
});
