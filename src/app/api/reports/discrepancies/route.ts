import { NextResponse } from "next/server";
import { CustodyEventType, RemitStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { detectSackDiscrepancy } from "@/lib/business/detectSackDiscrepancy";
import { resolveUserNames } from "@/lib/resolve-user-names";

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

    const events = await prisma.packageCustodyEvent.findMany({
      where: {
        resiId: { in: resiIds },
        eventType: { in: [CustodyEventType.MASUK_GUDANG, CustodyEventType.DIANGKUT_KE_GUDANG] },
      },
    });

    const missingResi = detectSackDiscrepancy(resiIds, events);
    if (missingResi.length > 0) {
      const noResiByResiId = new Map(sack.items.map((i) => [i.resiId, i.resi.noResi]));
      const nameByUserId = await resolveUserNames(missingResi.map((m) => m.pemegangTerakhir));
      sackDiscrepancies.push({
        sackId: sack.id,
        originInfo: sack.originInfo,
        destinationInfo: sack.destinationInfo,
        expectedCount: resiIds.length,
        arrivedCount: resiIds.length - missingResi.length,
        missingResi: missingResi.map((m) => ({
          resiId: m.resiId,
          noResi: noResiByResiId.get(m.resiId) ?? null,
          pemegangTerakhir: nameByUserId.get(m.pemegangTerakhir) ?? m.pemegangTerakhir,
          waktuTerakhirTercatat: m.waktuTerakhirTercatat,
        })),
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
