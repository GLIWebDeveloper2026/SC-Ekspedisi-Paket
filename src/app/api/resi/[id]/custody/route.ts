import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";

export const GET = withApiErrorHandling(async (_req, ctx) => {
  await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const resi = await prisma.resi.findUnique({ where: { id }, select: { id: true } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  const events = await prisma.packageCustodyEvent.findMany({
    where: { resiId: id },
    orderBy: { timestamp: "asc" },
  });

  const currentHolder = resolveLastCustody(events);

  return NextResponse.json({
    resiId: id,
    history: events.map((e) => ({
      eventType: e.eventType,
      fromEntity: e.fromEntity,
      toEntity: e.toEntity,
      notes: e.notes,
      evidenceUrl: e.evidenceUrl,
      timestamp: e.timestamp,
    })),
    currentHolder: currentHolder
      ? { eventType: currentHolder.eventType, toEntity: currentHolder.toEntity }
      : null,
  });
});
