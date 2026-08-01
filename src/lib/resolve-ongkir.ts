import { ServiceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-utils";
import { hitungOngkir } from "@/lib/business/hitungOngkir";

/**
 * Cari TariffRule aktif untuk serviceType+tanggal, ambil ZoneSurcharge (kalau
 * ada), lalu hitung ongkir. Dipakai baik saat resi BENERAN dibuat (POST
 * /api/resi) maupun saat preview (POST /api/resi/preview) — supaya angka yang
 * ditampilkan sebelum submit dijamin identik dengan yang benar-benar disimpan.
 */
export async function resolveOngkirForResi(input: {
  serviceType: ServiceType;
  destinationDistrictId: string;
  beratAktualKg: number;
  panjangCm: number;
  lebarCm: number;
  tinggiCm: number;
}) {
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

  return { tariffRule, hasil };
}
