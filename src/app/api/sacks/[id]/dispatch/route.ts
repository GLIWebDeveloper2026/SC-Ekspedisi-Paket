import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { getGudangStaffIds, notifyUsers } from "@/lib/notify";

const dispatchSchema = z.object({ courierId: z.string().min(1).optional() });

/**
 * Kurir KONFIRMASI SENDIRI bahwa dia sudah fisik mengambil karung ini dari
 * agen — inilah momen yang tercatat sebagai DIANGKUT_KE_GUDANG (bukan saat
 * Kepala Gudang menunjuk di /assign-pickup). Kurir tidak bisa memaksa
 * courierId siapapun selain dirinya sendiri (sama seperti pola self-lock di
 * /api/delivery-attempts). Owner boleh override manual (mis. kurir tidak
 * pegang HP) dengan menyebut courierId eksplisit di body.
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth([Role.KURIR, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json().catch(() => ({}));
  const parsed = dispatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const sack = await prisma.sack.findUnique({ where: { id }, include: { items: true } });
  if (!sack) {
    throw new ApiError("NOT_FOUND", "Karung tidak ditemukan", 404);
  }
  if (sack.items.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Karung ini tidak berisi resi apa pun", 400);
  }

  const transportedByUserId =
    session.user.role === Role.KURIR ? session.user.id : (parsed.data.courierId ?? sack.assignedPickupCourierId);
  if (!transportedByUserId) {
    throw new ApiError("VALIDATION_ERROR", "Karung ini belum ditugaskan ke kurir manapun", 400);
  }

  if (session.user.role === Role.KURIR && sack.assignedPickupCourierId !== session.user.id) {
    throw new ApiError("FORBIDDEN", "Karung ini bukan tugas jemputanmu", 403);
  }

  const kurir = await prisma.user.findUnique({ where: { id: transportedByUserId } });
  if (!kurir || kurir.role !== Role.KURIR || !kurir.isActive) {
    throw new ApiError("VALIDATION_ERROR", "Kurir penjemput harus kurir aktif", 400);
  }

  const resiIds = sack.items.map((i) => i.resiId);
  const alreadyDispatched = await prisma.packageCustodyEvent.count({
    where: { resiId: { in: resiIds }, eventType: CustodyEventType.DIANGKUT_KE_GUDANG },
  });
  if (alreadyDispatched > 0) {
    throw new ApiError("CONFLICT", "Karung ini sudah pernah ditandai diangkut ke gudang", 409);
  }

  await prisma.packageCustodyEvent.createMany({
    data: resiIds.map((resiId) => ({
      resiId,
      eventType: CustodyEventType.DIANGKUT_KE_GUDANG,
      fromEntity: sack.originInfo,
      toEntity: sack.destinationInfo,
      actorUserId: transportedByUserId,
    })),
  });

  const gudangStaffIds = await getGudangStaffIds();
  await notifyUsers(gudangStaffIds, {
    title: "Karung diambil kurir",
    body: `${kurir.name} sudah mengambil karung dari ${sack.originInfo}, otw ke ${sack.destinationInfo}`,
    link: "/sacks",
  });

  return NextResponse.json({ sackId: sack.id, transportedByUserId, resiCount: resiIds.length });
});
