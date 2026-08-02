import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { notifyUsers } from "@/lib/notify";

const assignPickupSchema = z.object({ courierId: z.string().min(1) });

/**
 * Kepala Gudang MENUNJUK kurir penjemput — bukan custody event, cuma
 * penunjukan administratif. Belum ada perpindahan fisik saat ini (Kepala
 * Gudang menunjuk dari balik meja, kurirnya baru berangkat ke lokasi agen
 * setelahnya). Event DIANGKUT_KE_GUDANG baru tercatat saat kurir sendiri
 * konfirmasi lewat POST /api/sacks/:id/dispatch — supaya waktu di custody
 * log mencerminkan momen serah terima fisik yang sebenarnya, bukan momen
 * penunjukan di aplikasi.
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json();
  const parsed = assignPickupSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const { courierId } = parsed.data;

  const sack = await prisma.sack.findUnique({ where: { id }, include: { items: true } });
  if (!sack) {
    throw new ApiError("NOT_FOUND", "Karung tidak ditemukan", 404);
  }
  if (sack.items.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Karung ini tidak berisi resi apa pun", 400);
  }

  const resiIds = sack.items.map((i) => i.resiId);
  const alreadyDispatched = await prisma.packageCustodyEvent.count({
    where: { resiId: { in: resiIds }, eventType: CustodyEventType.DIANGKUT_KE_GUDANG },
  });
  if (alreadyDispatched > 0) {
    throw new ApiError("CONFLICT", "Karung ini sudah pernah diangkut ke gudang", 409);
  }

  const kurir = await prisma.user.findUnique({ where: { id: courierId } });
  if (!kurir || kurir.role !== Role.KURIR || !kurir.isActive) {
    throw new ApiError("VALIDATION_ERROR", "courierId harus kurir aktif", 400);
  }

  await prisma.sack.update({ where: { id }, data: { assignedPickupCourierId: courierId } });

  await notifyUsers([courierId], {
    title: "Tugas jemput karung baru",
    body: `Jemput karung dari ${sack.originInfo} (${resiIds.length} resi) menuju ${sack.destinationInfo}`,
    link: "/kurir",
  });

  return NextResponse.json({ sackId: id, assignedPickupCourierId: courierId });
});
