import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, RemitStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { hitungDiscrepancyRemit } from "@/lib/business/hitungSetoranCod";

const remitSchema = z.object({
  remitAmount: z.number().nonnegative(),
});

export const POST = withApiErrorHandling(async (req, ctx) => {
  await requireAuth([Role.KURIR, Role.ADMIN_PUSAT, Role.OWNER]);
  const { resiId } = await (ctx as { params: Promise<{ resiId: string }> }).params;

  const body = await req.json();
  const parsed = remitSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const collection = await prisma.codCollection.findUnique({ where: { resiId } });
  if (!collection) {
    throw new ApiError("NOT_FOUND", "CodCollection untuk resi ini tidak ditemukan", 404);
  }

  const { discrepancyAmount, remitStatus } = hitungDiscrepancyRemit({
    expectedRemit: Number(collection.expectedRemit),
    remitAmount: parsed.data.remitAmount,
  });

  const updated = await prisma.codCollection.update({
    where: { resiId },
    data: {
      remitAmount: parsed.data.remitAmount,
      remittedAt: new Date(),
      discrepancyAmount,
      remitStatus: remitStatus as RemitStatus,
    },
  });

  return NextResponse.json({
    expectedRemit: Number(updated.expectedRemit),
    remitAmount: Number(updated.remitAmount),
    discrepancyAmount: Number(updated.discrepancyAmount),
    remitStatus: updated.remitStatus,
  });
});
