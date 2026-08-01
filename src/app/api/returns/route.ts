import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, ReturnBorneBy, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createReturnSchema = z.object({
  resiId: z.string().min(1),
  reason: z.string().min(1),
  returnShippingCost: z.number().nonnegative(),
  borneBy: z.enum(ReturnBorneBy),
});

export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.ADMIN_PUSAT, Role.OWNER]);

  const body = await req.json();
  const parsed = createReturnSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const resi = await prisma.resi.findUnique({ where: { id: input.resiId } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const ret = await tx.return.create({
      data: {
        resiId: input.resiId,
        reason: input.reason,
        returnShippingCost: input.returnShippingCost,
        borneBy: input.borneBy,
      },
    });

    await tx.packageCustodyEvent.create({
      data: {
        resiId: input.resiId,
        eventType: CustodyEventType.RETUR_KE_PENGIRIM,
        actorUserId: session.user.id,
        notes: input.reason,
      },
    });

    return ret;
  });

  return NextResponse.json(
    {
      id: result.id,
      resiId: result.resiId,
      reason: result.reason,
      returnShippingCost: Number(result.returnShippingCost),
      borneBy: result.borneBy,
      initiatedAt: result.initiatedAt,
    },
    { status: 201 },
  );
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const returns = await prisma.return.findMany({
    include: { resi: { select: { noResi: true } } },
    orderBy: { initiatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: returns.map((r) => ({
      id: r.id,
      resiId: r.resiId,
      noResi: r.resi.noResi,
      reason: r.reason,
      returnShippingCost: Number(r.returnShippingCost),
      borneBy: r.borneBy,
      initiatedAt: r.initiatedAt,
    })),
  });
});
