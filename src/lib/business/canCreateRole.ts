import type { Role } from "@prisma/client";

/**
 * Matriks siapa boleh membuat akun role apa (lihat docs/11-KELOLA-AKUN-DAN-AUTH.md §1.1).
 * Admin Pusat SENGAJA tidak boleh bikin sesama Admin Pusat/Owner — mencegah
 * privilege escalation berantai dari satu akun admin yang disalahgunakan.
 */
export function canCreateRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "OWNER") return true;

  if (actorRole === "ADMIN_PUSAT") {
    return !["OWNER", "ADMIN_PUSAT"].includes(targetRole);
  }

  if (actorRole === "KEPALA_GUDANG") {
    // Hanya kurir, dan wajib di-scope ke gudangnya sendiri (dicek terpisah di route).
    return targetRole === "KURIR";
  }

  return false;
}
