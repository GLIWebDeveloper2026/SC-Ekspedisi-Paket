import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/** Kurir adalah User biasa dengan role KURIR, bukan tabel Courier terpisah. */
export const GET = withApiErrorHandling(async () => {
  await requireAuth();
  const couriers = await prisma.user.findMany({
    where: { role: Role.KURIR, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: couriers });
});
