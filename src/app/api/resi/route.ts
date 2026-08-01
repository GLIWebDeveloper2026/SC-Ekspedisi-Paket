import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, ServiceType, CustodyEventType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, requireAuth, withApiErrorHandling } from "@/lib/api-utils";
import { generateNoResi } from "@/lib/business/generateNoResi";
import { resolveOngkirForResi } from "@/lib/resolve-ongkir";

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
  itemDescription: z.string().optional(),
  isFragile: z.boolean().default(false),
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

  // Petugas Loket cuma boleh bikin resi atas nama agennya sendiri — dipaksa
  // dari session, bukan dipercaya dari body request.
  if (session.user.role === Role.PETUGAS_LOKET) {
    if (!session.user.agentId) {
      throw new ApiError("FORBIDDEN", "Akun ini tidak terdaftar di agen mana pun", 403);
    }
    input.originAgentId = session.user.agentId;
  }

  const now = new Date();
  const { tariffRule, hasil } = await resolveOngkirForResi(input);

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
        itemDescription: input.itemDescription || null,
        isFragile: input.isFragile,
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

/**
 * Pagination wajib di backend (bukan ambil semua lalu potong di frontend) —
 * begitu data ratusan/ribuan resi, ambil semua sekaligus bikin lambat & boros.
 * Lihat docs/04-API-CONTRACT.md.
 */
export const GET = withApiErrorHandling(async (req) => {
  const session = await requireAuth();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const serviceType = searchParams.get("serviceType");
  const availableForSack = searchParams.get("availableForSack") === "true";
  const availableForPayment = searchParams.get("availableForPayment") === "true";
  const readyForSortir = searchParams.get("readyForSortir") === "true";
  const destinationDistrictId = searchParams.get("destinationDistrictId");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  // Petugas Loket cuma boleh lihat resi buatan agennya sendiri — di-paksa dari
  // session, BUKAN dari query param `agentId` (jangan biarkan dia minta lihat
  // agen lain lewat URL).
  const agentId =
    session.user.role === Role.PETUGAS_LOKET ? session.user.agentId : searchParams.get("agentId");

  const where = {
    ...(search
      ? {
          OR: [
            { noResi: { contains: search, mode: "insensitive" as const } },
            { senderName: { contains: search, mode: "insensitive" as const } },
            { recipientName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(agentId ? { originAgentId: agentId } : {}),
    ...(serviceType ? { serviceType: serviceType as ServiceType } : {}),
    ...(availableForSack ? { sackItems: { none: {} } } : {}),
    ...(availableForPayment ? { isCod: false, paymentItems: { none: {} } } : {}),
    ...(destinationDistrictId ? { destinationDistrictId } : {}),
    ...(readyForSortir
      ? {
          custodyEvents: {
            some: { eventType: CustodyEventType.MASUK_GUDANG },
            none: {
              eventType: { in: [CustodyEventType.KELUAR_GUDANG, CustodyEventType.DISERAHKAN_KE_KURIR] },
            },
          },
        }
      : {}),
  };

  const [resiList, totalItems] = await Promise.all([
    prisma.resi.findMany({
      where,
      include: { originAgent: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.resi.count({ where }),
  ]);

  return NextResponse.json({
    items: resiList.map((r) => ({
      id: r.id,
      noResi: r.noResi,
      senderName: r.senderName,
      recipientName: r.recipientName,
      serviceType: r.serviceType,
      totalOngkir: Number(r.totalOngkir),
      isCod: r.isCod,
      isFragile: r.isFragile,
      itemDescription: r.itemDescription,
      beratTertagihKg: Number(r.beratTertagihKg),
      destinationDistrictId: r.destinationDistrictId,
      createdAt: r.createdAt,
      originAgent: r.originAgent,
    })),
    page,
    pageSize,
    totalItems,
  });
});
