import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { resolveLastCustody } from "@/lib/business/resolveLastCustody";
import { getLoketStaffIdsForAgent, notifyUsers } from "@/lib/notify";

const schema = z.object({ transportedByUserId: z.string().min(1) });

/**
 * Leg retur gudang -> agen asal (kebalikan dari /dispatch yang sudah ada
 * untuk leg agen -> gudang). Kepala Gudang assign kurir yang bawa balik.
 */
export const POST = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const resi = await prisma.resi.findUnique({ where: { id }, include: { custodyEvents: true } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }
  const last = resolveLastCustody(resi.custodyEvents);
  if (last?.eventType !== CustodyEventType.RETUR_KE_GUDANG) {
    throw new ApiError("VALIDATION_ERROR", "Resi ini belum berstatus RETUR_KE_GUDANG", 400);
  }

  const kurir = await prisma.user.findUnique({ where: { id: parsed.data.transportedByUserId } });
  if (!kurir || kurir.role !== Role.KURIR || !kurir.isActive) {
    throw new ApiError("VALIDATION_ERROR", "transportedByUserId harus kurir aktif", 400);
  }

  await prisma.packageCustodyEvent.create({
    data: {
      resiId: id,
      eventType: CustodyEventType.DIANGKUT_KEMBALI_KE_AGEN,
      actorUserId: parsed.data.transportedByUserId,
    },
  });

  const loketStaffIds = await getLoketStaffIdsForAgent(resi.originAgentId);
  await Promise.all([
    notifyUsers([kurir.id], {
      title: "Tugas bawa retur ke agen",
      body: `Bawa retur resi ${resi.noResi} kembali ke agen asal`,
      link: "/kurir",
    }),
    notifyUsers(loketStaffIds, {
      title: "Retur menuju agen",
      body: `Retur resi ${resi.noResi} sedang dalam perjalanan kembali, dibawa ${kurir.name}`,
      link: "/returns",
    }),
  ]);

  return NextResponse.json({ resiId: id, status: "DIANGKUT_KEMBALI_KE_AGEN" });
});
