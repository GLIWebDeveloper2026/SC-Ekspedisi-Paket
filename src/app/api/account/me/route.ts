import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      agent: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
  });
  if (!user) {
    throw new ApiError("NOT_FOUND", "Akun tidak ditemukan", 404);
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    agentName: user.agent?.name ?? null,
    warehouseName: user.warehouse?.name ?? null,
  });
});
