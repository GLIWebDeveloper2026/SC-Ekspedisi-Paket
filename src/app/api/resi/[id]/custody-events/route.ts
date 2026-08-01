import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const addCustodyEventSchema = z.object({
  eventType: z.enum(CustodyEventType),
  toEntity: z.string().optional(),
  fromEntity: z.string().optional(),
  notes: z.string().optional(),
  evidenceUrl: z.string().optional(),
});

export const POST = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.ADMIN_PUSAT, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const resi = await prisma.resi.findUnique({ where: { id }, select: { id: true } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  const body = await req.json();
  const parsed = addCustodyEventSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const event = await prisma.packageCustodyEvent.create({
    data: {
      resiId: id,
      eventType: input.eventType,
      toEntity: input.toEntity,
      fromEntity: input.fromEntity,
      notes: input.notes,
      evidenceUrl: input.evidenceUrl,
      actorUserId: session.user.id,
    },
  });

  return NextResponse.json(
    {
      id: event.id,
      resiId: event.resiId,
      eventType: event.eventType,
      toEntity: event.toEntity,
      fromEntity: event.fromEntity,
      timestamp: event.timestamp,
    },
    { status: 201 },
  );
});
