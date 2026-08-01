import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const collections = await prisma.codCollection.findMany({
    include: { resi: { select: { noResi: true } }, courier: { select: { name: true } } },
    orderBy: { collectedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: collections.map((c) => ({
      resiId: c.resiId,
      noResi: c.resi.noResi,
      courierId: c.courierId,
      courierName: c.courier.name,
      collectedAmount: Number(c.collectedAmount),
      komisiPercent: Number(c.komisiPercent),
      expectedRemit: Number(c.expectedRemit),
      remitStatus: c.remitStatus,
      remitAmount: c.remitAmount ? Number(c.remitAmount) : null,
      discrepancyAmount: c.discrepancyAmount ? Number(c.discrepancyAmount) : null,
      collectedAt: c.collectedAt,
      remittedAt: c.remittedAt,
    })),
  });
});
