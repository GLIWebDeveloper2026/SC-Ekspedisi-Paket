import { NextResponse } from "next/server";
import { CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { detectKurirAssignmentDiscrepancy } from "@/lib/business/detectKurirAssignmentDiscrepancy";
import { resolveUserNames } from "@/lib/resolve-user-names";

/**
 * Tab 2 Investigasi Selisih: rekap semua kurir yang punya resi ditugaskan
 * (DISERAHKAN_KE_KURIR) tapi belum ada laporan hasil (TERKIRIM/RETUR_KE_GUDANG).
 * Pola sama seperti selisih karung, cuma untuk leg gudang -> penerima.
 */
export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const assignedEvents = await prisma.packageCustodyEvent.findMany({
    where: { eventType: CustodyEventType.DISERAHKAN_KE_KURIR },
    select: { resiId: true, toEntity: true },
    distinct: ["resiId"],
  });

  const resiIdsByKurir = new Map<string, string[]>();
  for (const e of assignedEvents) {
    if (!e.toEntity) continue;
    const list = resiIdsByKurir.get(e.toEntity) ?? [];
    list.push(e.resiId);
    resiIdsByKurir.set(e.toEntity, list);
  }

  const allResiIds = assignedEvents.map((e) => e.resiId);
  const events = allResiIds.length
    ? await prisma.packageCustodyEvent.findMany({
        where: {
          resiId: { in: allResiIds },
          eventType: {
            in: [
              CustodyEventType.DISERAHKAN_KE_KURIR,
              CustodyEventType.TERKIRIM,
              CustodyEventType.RETUR_KE_GUDANG,
            ],
          },
        },
      })
    : [];

  const results: { kurirId: string; kurirName: string; belumSelesai: ReturnType<typeof detectKurirAssignmentDiscrepancy> }[] = [];

  for (const [kurirId, resiIds] of resiIdsByKurir) {
    const belumSelesai = detectKurirAssignmentDiscrepancy(resiIds, events);
    if (belumSelesai.length > 0) {
      results.push({ kurirId, kurirName: kurirId, belumSelesai });
    }
  }

  const nameByUserId = await resolveUserNames(results.map((r) => r.kurirId));
  const resiList = await prisma.resi.findMany({
    where: { id: { in: results.flatMap((r) => r.belumSelesai.map((b) => b.resiId)) } },
    select: { id: true, noResi: true },
  });
  const noResiByResiId = new Map(resiList.map((r) => [r.id, r.noResi]));

  return NextResponse.json({
    data: results.map((r) => ({
      kurirId: r.kurirId,
      kurirName: nameByUserId.get(r.kurirId) ?? r.kurirId,
      belumSelesai: r.belumSelesai.map((b) => ({ ...b, noResi: noResiByResiId.get(b.resiId) ?? null })),
    })),
  });
});
