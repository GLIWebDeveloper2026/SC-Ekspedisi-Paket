import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, withApiErrorHandling } from "@/lib/api-utils";
import { translateCustodyStatus } from "@/lib/business/translateCustodyStatus";

/**
 * Endpoint PUBLIK — sengaja TIDAK memanggil requireAuth(). Data yang
 * dikembalikan disaring ketat: tidak ada actorUserId, nominal uang, atau
 * alamat lengkap. Lihat docs/14-PELACAKAN-PUBLIK.md.
 */
export const GET = withApiErrorHandling(async (_req, ctx) => {
  const { noResi } = await (ctx as { params: Promise<{ noResi: string }> }).params;

  const resi = await prisma.resi.findUnique({
    where: { noResi },
    select: { id: true, noResi: true, destinationDistrictId: true, serviceType: true },
  });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Nomor resi tidak ditemukan", 404);
  }

  const [district, events] = await Promise.all([
    prisma.district.findUnique({ where: { id: resi.destinationDistrictId }, select: { name: true } }),
    prisma.packageCustodyEvent.findMany({
      where: { resiId: resi.id },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  const riwayat = events
    .map((e) => {
      // notes untuk DELIVERY_ATTEMPT diformat "Percobaan ke-N: <DeliveryResult>"
      // (lihat src/app/api/delivery-attempts/route.ts) — ambil segmen terakhirnya.
      const deliveryResult =
        e.eventType === CustodyEventType.DELIVERY_ATTEMPT ? e.notes?.split(": ").pop() : undefined;
      return {
        label: translateCustodyStatus(e.eventType, deliveryResult),
        waktu: e.timestamp,
      };
    })
    .filter((r): r is { label: string; waktu: Date } => r.label !== null);

  const sudahTerkirim = events.some((e) => e.eventType === CustodyEventType.TERKIRIM);

  return NextResponse.json({
    noResi: resi.noResi,
    tujuanKecamatan: district?.name ?? null,
    estimasiLayanan: resi.serviceType,
    riwayat,
    sudahTerkirim,
  });
});
