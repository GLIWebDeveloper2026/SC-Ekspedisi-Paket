import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";
import { isEligibleForReturn } from "@/lib/business/checkRetur";

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const now = new Date();

  const candidates = await prisma.resi.findMany({
    where: { returns: { none: {} } },
    include: { custodyEvents: true },
    orderBy: { createdAt: "asc" },
  });

  const pending = candidates
    .filter((r) => isEligibleForReturn(r.createdAt, now))
    .filter((r) => resolveLastCustody(r.custodyEvents)?.eventType !== CustodyEventType.TERKIRIM)
    .map((r) => ({
      resiId: r.id,
      noResi: r.noResi,
      createdAt: r.createdAt,
      daysSinceCreated: Math.floor((now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      lastHolder: resolveLastCustody(r.custodyEvents),
    }));

  return NextResponse.json({ data: pending });
});
