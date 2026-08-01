import { NextResponse } from "next/server";
import { CustodyEventType, RemitStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const sacks = await prisma.sack.findMany({
    include: { items: { include: { resi: { select: { id: true, noResi: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const sackDiscrepancies = [];
  for (const sack of sacks) {
    const resiIds = sack.items.map((i) => i.resiId);
    if (resiIds.length === 0) continue;

    const arrivedEvents = await prisma.packageCustodyEvent.findMany({
      where: { resiId: { in: resiIds }, eventType: CustodyEventType.MASUK_GUDANG },
      select: { resiId: true },
      distinct: ["resiId"],
    });
    const arrivedCount = arrivedEvents.length;

    if (arrivedCount !== resiIds.length) {
      sackDiscrepancies.push({
        sackId: sack.id,
        originInfo: sack.originInfo,
        destinationInfo: sack.destinationInfo,
        expectedCount: resiIds.length,
        arrivedCount,
        missingResi: sack.items
          .filter((i) => !arrivedEvents.some((e) => e.resiId === i.resiId))
          .map((i) => ({ resiId: i.resiId, noResi: i.resi.noResi })),
      });
    }
  }

  const codDiscrepancies = await prisma.codCollection.findMany({
    where: { remitStatus: RemitStatus.DISCREPANCY },
    include: { resi: { select: { noResi: true } }, courier: { select: { name: true } } },
    orderBy: { remittedAt: "desc" },
  });

  return NextResponse.json({
    sackDiscrepancies,
    codDiscrepancies: codDiscrepancies.map((c) => ({
      resiId: c.resiId,
      noResi: c.resi.noResi,
      courierName: c.courier.name,
      expectedRemit: Number(c.expectedRemit),
      remitAmount: c.remitAmount ? Number(c.remitAmount) : null,
      discrepancyAmount: c.discrepancyAmount ? Number(c.discrepancyAmount) : null,
    })),
  });
});
