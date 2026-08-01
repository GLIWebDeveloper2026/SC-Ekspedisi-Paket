import { NextResponse } from "next/server";
import { z } from "zod";
import { CustodyEventType, DeliveryResult, Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { shouldTriggerAutoReturn } from "@/lib/business/checkRetur";
import { hitungSetoranCod } from "@/lib/business/hitungSetoranCod";
import { uploadProofPhoto } from "@/lib/supabase";
import { KOMISI_DEFAULT_PERCENT } from "@/lib/business/config";

const baseSchema = z.object({
  resiId: z.string().min(1),
  courierId: z.string().min(1),
  result: z.enum(DeliveryResult),
  recipientName: z.string().optional(),
  thirdPartyFlag: z.coerce.boolean().default(false),
  thirdPartyName: z.string().optional(),
  evidenceNote: z.string().optional(),
});

export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth([Role.KURIR, Role.OWNER]);

  const contentType = req.headers.get("content-type") || "";
  let raw: Record<string, unknown>;
  let proofPhotoFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    raw = Object.fromEntries(formData.entries());
    const file = formData.get("proofPhoto");
    if (file instanceof File && file.size > 0) proofPhotoFile = file;
  } else {
    raw = await req.json();
  }

  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  // Kurir cuma boleh lapor atas nama dirinya sendiri — dipaksa dari session,
  // bukan dari body (jangan biarkan kurir lapor seolah-olah kurir lain).
  if (session.user.role === Role.KURIR) {
    input.courierId = session.user.id;
  }

  if (input.thirdPartyFlag && (!input.thirdPartyName || (!proofPhotoFile && !input.evidenceNote))) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Titip pihak ketiga wajib ada nama penerima titipan dan bukti foto/keterangan",
      400,
    );
  }

  const resi = await prisma.resi.findUnique({ where: { id: input.resiId } });
  if (!resi) {
    throw new ApiError("NOT_FOUND", "Resi tidak ditemukan", 404);
  }

  // Kurir adalah User biasa (role KURIR), bukan tabel Courier terpisah — jadi
  // courierId di sini WAJIB divalidasi merujuk ke User aktif dengan role KURIR
  // sebelum dipakai sebagai FK (lihat docs/11-KELOLA-AKUN-DAN-AUTH.md).
  const courier = await prisma.user.findUnique({ where: { id: input.courierId } });
  if (!courier || courier.role !== Role.KURIR || !courier.isActive) {
    throw new ApiError("VALIDATION_ERROR", "courierId tidak merujuk ke kurir aktif", 400);
  }

  const pastAttempts = await prisma.deliveryAttempt.findMany({
    where: { resiId: input.resiId },
    orderBy: { attemptNumber: "asc" },
  });
  const attemptNumber = pastAttempts.length + 1;

  const proofPhotoUrl = proofPhotoFile ? await uploadProofPhoto(proofPhotoFile) : null;

  const willTriggerReturn =
    input.result === DeliveryResult.GAGAL &&
    shouldTriggerAutoReturn(
      pastAttempts.map((a) => a.result),
      input.result,
    );

  const { attempt, codCollection } = await prisma.$transaction(async (tx) => {
    const attempt = await tx.deliveryAttempt.create({
      data: {
        resiId: input.resiId,
        courierId: input.courierId,
        attemptNumber,
        result: input.result,
        recipientName: input.recipientName,
        thirdPartyFlag: input.thirdPartyFlag,
        thirdPartyName: input.thirdPartyName,
        proofPhotoUrl: proofPhotoUrl ?? input.evidenceNote ?? null,
      },
    });

    await tx.packageCustodyEvent.create({
      data: {
        resiId: input.resiId,
        eventType: CustodyEventType.DELIVERY_ATTEMPT,
        toEntity: input.courierId,
        actorUserId: session.user.id,
        notes: `Percobaan ke-${attemptNumber}: ${input.result}`,
        evidenceUrl: proofPhotoUrl ?? undefined,
      },
    });

    let codCollection = null;
    if (input.result === DeliveryResult.BERHASIL) {
      await tx.packageCustodyEvent.create({
        data: {
          resiId: input.resiId,
          eventType: CustodyEventType.TERKIRIM,
          toEntity: input.recipientName ?? resi.recipientName,
          actorUserId: session.user.id,
        },
      });

      if (resi.isCod && resi.nilaiCod) {
        const setoran = hitungSetoranCod({
          nilaiCod: Number(resi.nilaiCod),
          ongkir: Number(resi.totalOngkir),
          komisiPercent: KOMISI_DEFAULT_PERCENT,
        });

        codCollection = await tx.codCollection.create({
          data: {
            resiId: input.resiId,
            courierId: input.courierId,
            collectedAmount: Number(resi.nilaiCod),
            komisiPercent: KOMISI_DEFAULT_PERCENT,
            expectedRemit: setoran.expectedRemit,
          },
        });
      }
    }

    if (willTriggerReturn) {
      await tx.packageCustodyEvent.create({
        data: {
          resiId: input.resiId,
          eventType: CustodyEventType.RETUR_KE_GUDANG,
          actorUserId: session.user.id,
          notes: "Otomatis: 3x percobaan antar gagal berturut-turut",
        },
      });
    }

    return { attempt, codCollection };
  });

  return NextResponse.json(
    {
      id: attempt.id,
      resiId: attempt.resiId,
      attemptNumber: attempt.attemptNumber,
      result: attempt.result,
      autoReturnTriggered: willTriggerReturn,
      codCollectionId: codCollection?.id ?? null,
    },
    { status: 201 },
  );
});
