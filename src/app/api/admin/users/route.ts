import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { canCreateRole } from "@/lib/business/canCreateRole";
import { hashPassword } from "@/lib/business/hashPassword";

const MANAGE_ACCOUNTS_ROLES = [Role.OWNER, Role.ADMIN_PUSAT, Role.KEPALA_GUDANG];

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(Role),
  agentId: z.string().optional(),
  warehouseId: z.string().optional(),
});

/** Buat akun baru — akses & scoping sesuai matriks di docs/11-KELOLA-AKUN-DAN-AUTH.md §1.1. */
export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth(MANAGE_ACCOUNTS_ROLES);

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  if (!canCreateRole(session.user.role, input.role)) {
    throw new ApiError("FORBIDDEN", "Role kamu tidak boleh membuat akun dengan role ini", 403);
  }

  // Kepala Gudang hanya boleh bikin kurir di gudangnya sendiri — tidak bisa pilih gudang lain.
  const warehouseId =
    session.user.role === Role.KEPALA_GUDANG ? session.user.warehouseId : (input.warehouseId ?? null);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError("CONFLICT", "Email/username sudah dipakai akun lain", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const newUser = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      agentId: input.agentId ?? null,
      warehouseId,
    },
  });

  return NextResponse.json(
    { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    { status: 201 },
  );
});

/** Daftar akun — Kepala Gudang hanya lihat kurir di gudangnya sendiri. */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth(MANAGE_ACCOUNTS_ROLES);

  const users = await prisma.user.findMany({
    where:
      session.user.role === Role.KEPALA_GUDANG
        ? { role: Role.KURIR, warehouseId: session.user.warehouseId }
        : undefined,
    include: {
      agent: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      agentName: u.agent?.name ?? null,
      warehouseName: u.warehouse?.name ?? null,
      createdAt: u.createdAt,
    })),
  });
});
