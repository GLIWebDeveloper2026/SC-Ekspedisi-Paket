import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
});

export const POST = withApiErrorHandling(async (req) => {
  await requireAuth([Role.OWNER]);

  const body = await req.json();
  const parsed = createWarehouseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const warehouse = await prisma.warehouse.create({ data: parsed.data });
  return NextResponse.json(warehouse, { status: 201 });
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: warehouses });
});
