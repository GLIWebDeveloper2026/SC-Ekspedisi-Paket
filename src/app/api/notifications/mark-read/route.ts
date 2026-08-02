import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const schema = z.object({ ids: z.array(z.string().min(1)).optional(), all: z.boolean().optional() });

export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth();

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  if (parsed.data.all) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
  } else if (parsed.data.ids?.length) {
    await prisma.notification.updateMany({
      where: { id: { in: parsed.data.ids }, userId: session.user.id },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ ok: true });
});
