import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

/** Bentuk error konsisten di semua endpoint, sesuai 04-API-CONTRACT.md. */
export function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Ambil session yang login; throw ApiError 401 kalau belum, dan 403 kalau role tidak diizinkan. */
export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();

  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "Anda belum login", 401);
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new ApiError("FORBIDDEN", "Anda tidak punya akses untuk aksi ini", 403);
  }

  return session;
}

/** Bungkus handler API supaya error mentah (Prisma, dll.) tidak bocor ke response. */
export function withApiErrorHandling(
  handler: (req: Request, ctx: unknown) => Promise<Response>,
) {
  return async (req: Request, ctx: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.code, err.message, err.status);
      }
      console.error(err);
      return errorResponse("INTERNAL_ERROR", "Terjadi kesalahan pada server", 500);
    }
  };
}
