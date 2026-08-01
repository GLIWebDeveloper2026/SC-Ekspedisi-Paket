import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async () => {
  await requireAuth();
  const agents = await prisma.agent.findMany({
    include: { district: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    data: agents.map((a) => ({ id: a.id, name: a.name, districtName: a.district.name })),
  });
});
