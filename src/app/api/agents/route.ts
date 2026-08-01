import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createAgentSchema = z.object({
  name: z.string().min(1),
  districtId: z.string().min(1),
});

export const POST = withApiErrorHandling(async (req) => {
  await requireAuth([Role.OWNER]);

  const body = await req.json();
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const district = await prisma.district.findUnique({ where: { id: input.districtId } });
  if (!district) {
    throw new ApiError("VALIDATION_ERROR", "districtId tidak ditemukan", 400);
  }

  const agent = await prisma.agent.create({ data: input });
  return NextResponse.json(agent, { status: 201 });
});

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
