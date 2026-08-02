import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/** Notifikasi milikku sendiri — 30 terbaru + jumlah belum dibaca. */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return NextResponse.json({ data: items, unreadCount });
});
