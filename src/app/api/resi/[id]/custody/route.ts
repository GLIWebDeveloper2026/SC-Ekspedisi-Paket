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

  // toEntity itu string bebas (bisa id User/Agent/Sack, atau teks yang sudah
  // manusiawi seperti nama penerima) — coba resolve ke nama sebenarnya, best
  // effort, sebelum jatuh balik ke nilai mentahnya.
  const candidateIds = [...new Set(events.map((e) => e.toEntity).filter((v): v is string => !!v))];
  const [users, agents, sacks] = candidateIds.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: candidateIds } }, select: { id: true, name: true } }),
        prisma.agent.findMany({ where: { id: { in: candidateIds } }, select: { id: true, name: true } }),
        prisma.sack.findMany({ where: { id: { in: candidateIds } }, select: { id: true, originInfo: true, destinationInfo: true } }),
      ])
    : [[], [], []];

  const labelById = new Map<string, string>();
  users.forEach((u) => labelById.set(u.id, u.name));
  agents.forEach((a) => labelById.set(a.id, a.name));
  sacks.forEach((s) => labelById.set(s.id, `Karung ${s.originInfo} → ${s.destinationInfo}`));

  const resolveLabel = (toEntity: string | null) =>
    toEntity ? (labelById.get(toEntity) ?? toEntity) : null;

  const currentHolder = resolveLastCustody(events);

  return NextResponse.json({
    resiId: id,
    history: events.map((e) => ({
      eventType: e.eventType,
      fromEntity: e.fromEntity,
      toEntity: e.toEntity,
      toEntityLabel: resolveLabel(e.toEntity),
      notes: e.notes,
      evidenceUrl: e.evidenceUrl,
      timestamp: e.timestamp,
    })),
    currentHolder: currentHolder
      ? {
          eventType: currentHolder.eventType,
          toEntity: currentHolder.toEntity,
          toEntityLabel: resolveLabel(currentHolder.toEntity),
        }
      : null,
  });
});
