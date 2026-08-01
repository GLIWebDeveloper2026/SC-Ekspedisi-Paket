import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";

/**
 * Semua resi COD dari saat resi dibuat — bukan cuma yang sudah ada
 * CodCollection (baru terbentuk setelah delivery attempt berhasil). Status
 * "BELUM_DIANTAR" dipakai untuk resi yang isCod=true tapi belum ada
 * CodCollection sama sekali. Khusus Owner/Kepala Gudang (lihat
 * docs — Petugas Loket cuma berperan di awal saat centang isCod).
 */
export const GET = withApiErrorHandling(async () => {
  await requireAuth([Role.OWNER, Role.KEPALA_GUDANG]);

  const resiList = await prisma.resi.findMany({
    where: { isCod: true },
    include: {
      codCollection: { include: { courier: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    data: resiList.map((r) => ({
      resiId: r.id,
      noResi: r.noResi,
      recipientName: r.recipientName,
      nilaiCod: Number(r.nilaiCod ?? 0),
      createdAt: r.createdAt,
      status: r.codCollection ? r.codCollection.remitStatus : "BELUM_DIANTAR",
      courierName: r.codCollection?.courier.name ?? null,
      expectedRemit: r.codCollection ? Number(r.codCollection.expectedRemit) : null,
      remitAmount: r.codCollection?.remitAmount ? Number(r.codCollection.remitAmount) : null,
      discrepancyAmount: r.codCollection?.discrepancyAmount
        ? Number(r.codCollection.discrepancyAmount)
        : null,
      remittedAt: r.codCollection?.remittedAt ?? null,
    })),
  });
});
