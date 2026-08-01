import { prisma } from "@/lib/db";

const SENTINELS = new Set(["TIDAK ADA CATATAN PENGANGKUT", "TIDAK ADA CATATAN PENUGASAN"]);

/**
 * `pemegangTerakhir` dari detectSackDiscrepancy/detectKurirAssignmentDiscrepancy
 * berisi User.id mentah (atau salah satu sentinel "tidak ada catatan") — resolve
 * ke nama supaya tidak tampil id acak di UI.
 */
export async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  const idsToLookup = [...new Set(userIds.filter((id) => !SENTINELS.has(id)))];
  if (idsToLookup.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: idsToLookup } },
    select: { id: true, name: true },
  });

  return new Map(users.map((u) => [u.id, u.name]));
}
