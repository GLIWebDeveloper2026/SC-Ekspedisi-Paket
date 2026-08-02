import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { notifyUsers } from "@/lib/notify";

const assignBatchSchema = z.object({
  resiIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 resi"),
  assignedKurirId: z.string().min(1),
});

/**
 * Sortir & assign kurir pengantar — BATCH, bukan satu-satu (pola sama kayak
 * bikin Sack: banyak resi -> 1 aksi). Kepala Gudang pilih beberapa resi
 * "searah" (sudah difilter 1 kecamatan tujuan di UI) lalu assign ke 1 kurir
 * sekaligus. Kurir yang dipilih WAJIB cover kecamatan tujuan semua resi yang
 * dipilih (lewat CourierDistrictCoverage) — dicegah di sini juga, bukan cuma
 * di UI, supaya tidak ada cara memaksa assign ke kurir di luar wilayahnya
 * (akar masalah insiden Bang Jack).
 */
export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth([Role.KEPALA_GUDANG, Role.OWNER]);

  const body = await req.json();
  const parsed = assignBatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const { resiIds, assignedKurirId } = parsed.data;

  const kurir = await prisma.user.findUnique({ where: { id: assignedKurirId } });
  if (!kurir || kurir.role !== Role.KURIR || !kurir.isActive) {
    throw new ApiError("VALIDATION_ERROR", "assignedKurirId harus kurir aktif", 400);
  }

  const resiList = await prisma.resi.findMany({
    where: { id: { in: resiIds } },
    select: { id: true, destinationDistrictId: true },
  });
  if (resiList.length !== resiIds.length) {
    throw new ApiError("VALIDATION_ERROR", "Ada resiId yang tidak ditemukan", 400);
  }

  const destinationDistrictIds = [...new Set(resiList.map((r) => r.destinationDistrictId))];
  const coverage = await prisma.courierDistrictCoverage.findMany({
    where: { courierId: assignedKurirId, districtId: { in: destinationDistrictIds } },
    select: { districtId: true },
  });
  const coveredIds = new Set(coverage.map((c) => c.districtId));
  const uncovered = destinationDistrictIds.filter((id) => !coveredIds.has(id));
  if (uncovered.length > 0) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Kurir ini tidak meng-cover semua kecamatan tujuan resi yang dipilih",
      400,
    );
  }

  await prisma.$transaction([
    prisma.packageCustodyEvent.createMany({
      data: resiIds.map((resiId) => ({
        resiId,
        eventType: CustodyEventType.KELUAR_GUDANG,
        actorUserId: session.user.id,
      })),
    }),
    prisma.packageCustodyEvent.createMany({
      data: resiIds.map((resiId) => ({
        resiId,
        eventType: CustodyEventType.DISERAHKAN_KE_KURIR,
        toEntity: assignedKurirId,
        actorUserId: session.user.id,
      })),
    }),
  ]);

  await notifyUsers([assignedKurirId], {
    title: "Tugas antar baru",
    body: `Kamu ditugaskan mengantar ${resiIds.length} resi`,
    link: "/kurir",
  });

  return NextResponse.json({ assignedKurirId, resiCount: resiIds.length });
});
