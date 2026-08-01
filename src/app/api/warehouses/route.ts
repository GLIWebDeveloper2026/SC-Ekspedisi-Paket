import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async () => {
  await requireAuth();
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: warehouses });
});
