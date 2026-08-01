import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { canCreateRole } from "@/lib/business/canCreateRole";
import { hashPassword } from "@/lib/business/hashPassword";

const MANAGE_ACCOUNTS_ROLES = [Role.OWNER, Role.ADMIN_PUSAT, Role.KEPALA_GUDANG];

const patchUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    newPassword: z.string().min(6, "Password minimal 6 karakter").optional(),
  })
  .refine((v) => v.isActive !== undefined || v.newPassword !== undefined, {
    message: "isActive atau newPassword wajib diisi",
  });

/** Nonaktifkan/aktifkan akun, atau reset password akun lain — bukan hapus akun. */
export const PATCH = withApiErrorHandling(async (req, ctx) => {
  const session = await requireAuth(MANAGE_ACCOUNTS_ROLES);
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new ApiError("NOT_FOUND", "Akun tidak ditemukan", 404);
  }

  if (!canCreateRole(session.user.role, target.role)) {
    throw new ApiError("FORBIDDEN", "Role kamu tidak boleh mengelola akun dengan role ini", 403);
  }
  if (session.user.role === Role.KEPALA_GUDANG && target.warehouseId !== session.user.warehouseId) {
    throw new ApiError("FORBIDDEN", "Kamu hanya bisa mengelola kurir di gudangmu sendiri", 403);
  }
  if (target.id === session.user.id) {
    throw new ApiError("VALIDATION_ERROR", "Tidak bisa mengelola akun sendiri lewat halaman ini", 400);
  }

  const body = await req.json();
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.newPassword ? { passwordHash: await hashPassword(input.newPassword) } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, isActive: updated.isActive });
});
