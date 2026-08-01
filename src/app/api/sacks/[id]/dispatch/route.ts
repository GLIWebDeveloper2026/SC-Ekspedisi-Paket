import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const dispatchSchema = z.object({
  transportedByUserId: z.string().min(1),
});

/**
 * Kepala Gudang menugaskan SIAPA yang mengangkut karung ini ke gudang
 * (dipilih dari kurir aktif, bukan self-claim kurir dan bukan Petugas Loket
 * — lihat docs/04-API-CONTRACT.md §"POST /api/sacks/:id/dispatch").
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json();
  const parsed = dispatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const { transportedByUserId } = parsed.data;

  const sack = await prisma.sack.findUnique({ where: { id }, include: { items: true } });
  if (!sack) {
    throw new ApiError("NOT_FOUND", "Karung tidak ditemukan", 404);
  }
  if (sack.items.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Karung ini tidak berisi resi apa pun", 400);
  }

  const kurir = await prisma.user.findUnique({ where: { id: transportedByUserId } });
  if (!kurir || kurir.role !== Role.KURIR || !kurir.isActive) {
    throw new ApiError("VALIDATION_ERROR", "transportedByUserId harus kurir aktif", 400);
  }

  const resiIds = sack.items.map((i) => i.resiId);
  const alreadyDispatched = await prisma.packageCustodyEvent.count({
    where: { resiId: { in: resiIds }, eventType: CustodyEventType.DIANGKUT_KE_GUDANG },
  });
  if (alreadyDispatched > 0) {
    throw new ApiError("CONFLICT", "Karung ini sudah pernah ditandai diangkut ke gudang", 409);
  }

  await prisma.packageCustodyEvent.createMany({
    data: resiIds.map((resiId) => ({
      resiId,
      eventType: CustodyEventType.DIANGKUT_KE_GUDANG,
      fromEntity: sack.originInfo,
      toEntity: sack.destinationInfo,
      actorUserId: transportedByUserId,
    })),
  });

  return NextResponse.json({ sackId: sack.id, transportedByUserId, resiCount: resiIds.length });
});
