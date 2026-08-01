import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { hashPassword } from "@/lib/business/hashPassword";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

/** Ganti password akun sendiri — beda dari reset oleh admin (wajib input password lama). */
export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth();

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    throw new ApiError("NOT_FOUND", "Akun tidak ditemukan", 404);
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError("VALIDATION_ERROR", "Password lama tidak cocok", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  return NextResponse.json({ message: "Password berhasil diganti" });
});
