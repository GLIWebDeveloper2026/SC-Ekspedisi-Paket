import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createDistrictSchema = z.object({
  name: z.string().min(1),
  isZonaJauh: z.boolean().default(false),
  surchargeAmount: z.number().nonnegative().optional(),
});

/**
 * Menambah kecamatan zona jauh SENGAJA langsung memaksa isi surcharge untuk
 * semua tarif yang lagi aktif (satu per serviceType) — kalau tidak, kecamatan
 * baru itu ditandai zona jauh tapi ongkirnya tetap dihitung seperti biasa
 * (salah secara diam-diam, bukan error keras). Lihat docs/04-API-CONTRACT.md.
 */
export const POST = withApiErrorHandling(async (req) => {
  await requireAuth([Role.OWNER]);

  const body = await req.json();
  const parsed = createDistrictSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  if (input.isZonaJauh && input.surchargeAmount === undefined) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Kecamatan zona jauh wajib diisi surchargeAmount untuk tarif yang sedang aktif",
      400,
    );
  }

  const district = await prisma.$transaction(async (tx) => {
    const created = await tx.district.create({
      data: { name: input.name, isZonaJauh: input.isZonaJauh },
    });

    if (input.isZonaJauh && input.surchargeAmount !== undefined) {
      const activeTariffRules = await tx.tariffRule.findMany({ where: { effectiveTo: null } });
      if (activeTariffRules.length > 0) {
        await tx.zoneSurcharge.createMany({
          data: activeTariffRules.map((rule) => ({
            tariffRuleId: rule.id,
            districtId: created.id,
            surchargeAmount: input.surchargeAmount!,
          })),
        });
      }
    }

    return created;
  });

  return NextResponse.json(district, { status: 201 });
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();
  const districts = await prisma.district.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: districts });
});
