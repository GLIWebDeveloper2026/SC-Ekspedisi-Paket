import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";

export const GET = withApiErrorHandling(async (_req, ctx) => {
  await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id },
    include: { items: { include: { resi: { select: { noResi: true, recipientName: true } } } } },
  });
  if (!transaction) {
    throw new ApiError("NOT_FOUND", "Transaksi tidak ditemukan", 404);
  }

  return NextResponse.json({
    id: transaction.id,
    payerName: transaction.payerName,
    method: transaction.method,
    totalAmount: Number(transaction.totalAmount),
    paymentDate: transaction.paymentDate,
    items: transaction.items.map((i) => ({
      resiId: i.resiId,
      noResi: i.resi.noResi,
      recipientName: i.resi.recipientName,
      amountAllocated: Number(i.amountAllocated),
    })),
  });
});
