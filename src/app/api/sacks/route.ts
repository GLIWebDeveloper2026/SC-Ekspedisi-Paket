import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createSackSchema = z.object({
  originInfo: z.string().min(1),
  destinationInfo: z.string().min(1),
  resiIds: z.array(z.string().min(1)).min(1, "Karung harus berisi minimal 1 resi"),
});

export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth([Role.PETUGAS_LOKET, Role.KEPALA_GUDANG, Role.OWNER]);

  const body = await req.json();
  const parsed = createSackSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const existingResiCount = await prisma.resi.count({ where: { id: { in: input.resiIds } } });
  if (existingResiCount !== input.resiIds.length) {
    throw new ApiError("VALIDATION_ERROR", "Ada resiId yang tidak ditemukan", 400);
  }

  const sack = await prisma.$transaction(async (tx) => {
    const created = await tx.sack.create({
      data: {
        originInfo: input.originInfo,
        destinationInfo: input.destinationInfo,
        items: { create: input.resiIds.map((resiId) => ({ resiId })) },
      },
      include: { items: true },
    });

    await tx.packageCustodyEvent.createMany({
      data: input.resiIds.map((resiId) => ({
        resiId,
        eventType: CustodyEventType.MASUK_KARUNG,
        toEntity: created.id,
        actorUserId: session.user.id,
      })),
    });

    return created;
  });

  return NextResponse.json(
    {
      id: sack.id,
      originInfo: sack.originInfo,
      destinationInfo: sack.destinationInfo,
      itemCount: sack.items.length,
      resiIds: sack.items.map((i) => i.resiId),
    },
    { status: 201 },
  );
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const sacks = await prisma.sack.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: sacks.map((s) => ({
      id: s.id,
      originInfo: s.originInfo,
      destinationInfo: s.destinationInfo,
      itemCount: s.items.length,
      createdAt: s.createdAt,
    })),
  });
});
