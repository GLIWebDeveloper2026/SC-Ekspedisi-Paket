import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ServiceType, CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { hitungOngkir } from "@/lib/business/hitungOngkir";
import { generateNoResi } from "@/lib/business/generateNoResi";

const createResiSchema = z.object({
  originAgentId: z.string().min(1),
  destinationDistrictId: z.string().min(1),
  senderName: z.string().min(1, "Nama pengirim wajib diisi"),
  senderPhone: z.string().min(1, "No HP pengirim wajib diisi"),
  recipientName: z.string().min(1, "Nama penerima wajib diisi"),
  recipientAddress: z.string().min(1, "Alamat penerima wajib diisi"),
  serviceType: z.enum(ServiceType),
  beratAktualKg: z.number().positive("Berat harus lebih dari 0"),
  panjangCm: z.number().positive(),
  lebarCm: z.number().positive(),
  tinggiCm: z.number().positive(),
  isCod: z.boolean().default(false),
  nilaiCod: z.number().positive().optional(),
});

export const POST = withApiErrorHandling(async (req) => {
  const session = await requireAuth([Role.PETUGAS_LOKET, Role.OWNER]);

  const body = await req.json();
  const parsed = createResiSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }
  const input = parsed.data;

  if (input.isCod && !input.nilaiCod) {
    throw new ApiError("VALIDATION_ERROR", "nilaiCod wajib diisi kalau isCod true", 400);
  }

  const now = new Date();

  const tariffRule = await prisma.tariffRule.findFirst({
    where: {
      serviceType: input.serviceType,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!tariffRule) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Tidak ada TariffRule aktif untuk serviceType ${input.serviceType} pada tanggal ini`,
      400,
    );
  }

  const zoneSurcharge = await prisma.zoneSurcharge.findUnique({
    where: {
      tariffRuleId_districtId: {
        tariffRuleId: tariffRule.id,
        districtId: input.destinationDistrictId,
      },
    },
  });

  const hasil = hitungOngkir({
    beratAktualKg: input.beratAktualKg,
    dimensi: { p: input.panjangCm, l: input.lebarCm, t: input.tinggiCm },
    tarif: {
      ratePerKg: Number(tariffRule.ratePerKg),
      volumetricDivisor: Number(tariffRule.volumetricDivisor),
      surchargeZona: zoneSurcharge ? Number(zoneSurcharge.surchargeAmount) : 0,
    },
  });

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const resiCountToday = await prisma.resi.count({
    where: { createdAt: { gte: startOfDay } },
  });
  const noResi = generateNoResi(now, resiCountToday);

  const resi = await prisma.$transaction(async (tx) => {
    const created = await tx.resi.create({
      data: {
        noResi,
        originAgentId: input.originAgentId,
        destinationDistrictId: input.destinationDistrictId,
        senderName: input.senderName,
        senderPhone: input.senderPhone,
        recipientName: input.recipientName,
        recipientAddress: input.recipientAddress,
        serviceType: input.serviceType,
        beratAktualKg: input.beratAktualKg,
        panjangCm: input.panjangCm,
        lebarCm: input.lebarCm,
        tinggiCm: input.tinggiCm,
        beratTertagihKg: hasil.beratTertagihKg,
        tariffRuleId: tariffRule.id,
        biayaDasar: hasil.biayaDasar,
        biayaZona: hasil.biayaZona,
        totalOngkir: hasil.total,
        isCod: input.isCod,
        nilaiCod: input.isCod ? input.nilaiCod : null,
      },
    });

    await tx.packageCustodyEvent.create({
      data: {
        resiId: created.id,
        eventType: CustodyEventType.DIBUAT_DI_LOKET,
        toEntity: input.originAgentId,
        actorUserId: session.user.id,
      },
    });

    return created;
  });

  return NextResponse.json(
    {
      id: resi.id,
      noResi: resi.noResi,
      beratTertagihKg: Number(resi.beratTertagihKg),
      biayaDasar: Number(resi.biayaDasar),
      biayaZona: Number(resi.biayaZona),
      totalOngkir: Number(resi.totalOngkir),
      tariffRuleId: resi.tariffRuleId,
    },
    { status: 201 },
  );
});

export const GET = withApiErrorHandling(async (req) => {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const resiList = await prisma.resi.findMany({
    where: search
      ? {
          OR: [
            { noResi: { contains: search, mode: "insensitive" } },
            { senderName: { contains: search, mode: "insensitive" } },
            { recipientName: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      originAgent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    data: resiList.map((r) => ({
      id: r.id,
      noResi: r.noResi,
      senderName: r.senderName,
      recipientName: r.recipientName,
      serviceType: r.serviceType,
      totalOngkir: Number(r.totalOngkir),
      isCod: r.isCod,
      createdAt: r.createdAt,
      originAgent: r.originAgent,
    })),
  });
});
