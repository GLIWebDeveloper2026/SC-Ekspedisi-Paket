-- Remove ADMIN_PUSAT role (never part of the original case study — only
-- Owner/Pemilik, Petugas Loket, Kepala Gudang, Kurir were interviewed) and
-- add DIANGKUT_KE_GUDANG custody event (in-transit leg from agent to
-- warehouse, for the sack-discrepancy investigation feature).

-- Safe to run unconditionally: on a fresh DB with no ADMIN_PUSAT rows this
-- is a no-op; on the live DB it removes the 2 seeded demo admin accounts.
DELETE FROM "User" WHERE "role" = 'ADMIN_PUSAT';

-- AlterEnum: Role — drop ADMIN_PUSAT (Postgres has no ALTER TYPE ... DROP
-- VALUE, so the type is recreated and the column re-pointed).
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'PETUGAS_LOKET', 'KEPALA_GUDANG', 'KURIR');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

-- AlterEnum: CustodyEventType — purely additive.
ALTER TYPE "CustodyEventType" ADD VALUE 'DIANGKUT_KE_GUDANG' BEFORE 'KELUAR_KARUNG';
