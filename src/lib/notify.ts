import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Kirim notifikasi in-app ke sekumpulan user — no-op kalau daftarnya kosong. */
export async function notifyUsers(
  userIds: string[],
  data: { title: string; body: string; link?: string },
) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, title: data.title, body: data.body, link: data.link })),
  });
}

/** Semua user aktif dengan role KEPALA_GUDANG/OWNER — dipakai buat notifikasi lintas gudang. */
export async function getGudangStaffIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.KEPALA_GUDANG, Role.OWNER] }, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** Semua Petugas Loket aktif di 1 agen — dipakai buat notifikasi ke loket asal. */
export async function getLoketStaffIdsForAgent(agentId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: Role.PETUGAS_LOKET, agentId, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
