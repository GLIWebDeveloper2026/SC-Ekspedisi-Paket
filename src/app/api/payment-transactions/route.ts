import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

const createPaymentSchema = z.object({
  payerName: z.string().min(1),
  method: z.string().min(1),
  items: z
    .array(
      z.object({
        resiId: z.string().min(1),
        amountAllocated: z.number().positive(),
      }),
    )
    .min(1, "Transaksi harus mencakup minimal 1 resi"),
});

export const POST = withApiErrorHandling(async (req) => {
  await requireAuth([Role.PETUGAS_LOKET, Role.OWNER]);

  const body = await req.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  const resiIds = input.items.map((i) => i.resiId);
  const existingCount = await prisma.resi.count({ where: { id: { in: resiIds } } });
  if (existingCount !== new Set(resiIds).size) {
    throw new ApiError("VALIDATION_ERROR", "Ada resiId yang tidak ditemukan", 400);
  }

  const totalAmount = input.items.reduce((sum, i) => sum + i.amountAllocated, 0);

  const transaction = await prisma.paymentTransaction.create({
    data: {
      payerName: input.payerName,
      method: input.method,
      totalAmount,
      items: {
        create: input.items.map((i) => ({
          resiId: i.resiId,
          amountAllocated: i.amountAllocated,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(
    {
      id: transaction.id,
      payerName: transaction.payerName,
      method: transaction.method,
      totalAmount: Number(transaction.totalAmount),
      paymentDate: transaction.paymentDate,
      items: transaction.items.map((i) => ({
        resiId: i.resiId,
        amountAllocated: Number(i.amountAllocated),
      })),
    },
    { status: 201 },
  );
});

export const GET = withApiErrorHandling(async () => {
  await requireAuth();

  const transactions = await prisma.paymentTransaction.findMany({
    include: { items: true },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: transactions.map((t) => ({
      id: t.id,
      payerName: t.payerName,
      method: t.method,
      totalAmount: Number(t.totalAmount),
      paymentDate: t.paymentDate,
      itemCount: t.items.length,
    })),
  });
});
