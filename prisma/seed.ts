import { PrismaClient, Role, ServiceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // 3 kecamatan (2 normal, 1 zona jauh) — tiap kecamatan punya agennya sendiri,
  // BUKAN satu agen untuk semua kecamatan (lihat 01-PRD.md soal kardinalitas).
  const districtPusat = await prisma.district.create({
    data: { name: "Kecamatan Pusat", isZonaJauh: false },
  });
  const districtSelatan = await prisma.district.create({
    data: { name: "Kecamatan Selatan", isZonaJauh: false },
  });
  const districtJauh = await prisma.district.create({
    data: { name: "Kecamatan Perbatasan", isZonaJauh: true },
  });

  const agentPusat = await prisma.agent.create({
    data: { name: "Agen Kecamatan Pusat", districtId: districtPusat.id },
  });
  const agentSelatan = await prisma.agent.create({
    data: { name: "Agen Kecamatan Selatan", districtId: districtSelatan.id },
  });
  const agentJauh = await prisma.agent.create({
    data: { name: "Agen Kecamatan Perbatasan", districtId: districtJauh.id },
  });

  const warehouse = await prisma.warehouse.create({
    data: { name: "Gudang Transit Utama" },
  });

  const tariffRule = await prisma.tariffRule.create({
    data: {
      serviceType: ServiceType.REGULER,
      ratePerKg: 12000,
      volumetricDivisor: 6000,
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      effectiveTo: null,
    },
  });
  await prisma.tariffRule.create({
    data: {
      serviceType: ServiceType.KILAT,
      ratePerKg: 20000,
      volumetricDivisor: 5000,
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      effectiveTo: null,
    },
  });
  await prisma.tariffRule.create({
    data: {
      serviceType: ServiceType.KARGO,
      ratePerKg: 8000,
      volumetricDivisor: 4000,
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      effectiveTo: null,
    },
  });

  await prisma.zoneSurcharge.create({
    data: {
      tariffRuleId: tariffRule.id,
      districtId: districtJauh.id,
      surchargeAmount: 15000,
    },
  });

  // Owner — kardinalitas biasanya 1, tapi skema tidak memaksa unik.
  await prisma.user.create({
    data: { name: "Owner Kilat", email: "owner@kilat.test", passwordHash, role: Role.OWNER },
  });

  // Petugas Loket — beberapa per agen, bukan 1 per agen.
  await prisma.user.createMany({
    data: [
      {
        name: "Petugas Loket Pusat",
        email: "loket@kilat.test",
        passwordHash,
        role: Role.PETUGAS_LOKET,
        agentId: agentPusat.id,
      },
      {
        name: "Petugas Loket Pusat 2",
        email: "loket2@kilat.test",
        passwordHash,
        role: Role.PETUGAS_LOKET,
        agentId: agentPusat.id,
      },
      {
        name: "Petugas Loket Selatan",
        email: "loket3@kilat.test",
        passwordHash,
        role: Role.PETUGAS_LOKET,
        agentId: agentSelatan.id,
      },
      {
        name: "Petugas Loket Perbatasan",
        email: "loket4@kilat.test",
        passwordHash,
        role: Role.PETUGAS_LOKET,
        agentId: agentJauh.id,
      },
    ],
  });

  // Kepala Gudang — 1 di gudang ini (skema tetap mendukung >1 kalau perlu shift).
  await prisma.user.create({
    data: {
      name: "Kepala Gudang",
      email: "gudang@kilat.test",
      passwordHash,
      role: Role.KEPALA_GUDANG,
      warehouseId: warehouse.id,
    },
  });

  // Kurir — User biasa dengan role KURIR (BUKAN tabel Courier terpisah).
  // 11 kurir sesuai skala studi kasus asli.
  await prisma.user.createMany({
    data: Array.from({ length: 11 }, (_, i) => ({
      name: i === 0 ? "Kurir Andi" : `Kurir ${i + 1}`,
      email: i === 0 ? "kurir@kilat.test" : `kurir${i + 1}@kilat.test`,
      passwordHash,
      role: Role.KURIR,
      warehouseId: warehouse.id,
    })),
  });
  const kurirList = await prisma.user.findMany({ where: { role: Role.KURIR }, orderBy: { email: "asc" } });

  // Cakupan wilayah kurir — TANPA ini, dropdown "pilih kurir" di /sortir dan
  // /api/sacks/:id/assign-pickup selalu kosong untuk semua kecamatan (tidak
  // ada satu pun kurir yang meng-cover apa pun secara default). Tiap
  // kecamatan sengaja dipegang beberapa kurir (backup), dengan sedikit
  // overlap di kurir "penghubung" antar wilayah.
  await prisma.courierDistrictCoverage.createMany({
    data: [
      ...kurirList.slice(0, 4).map((k) => ({ courierId: k.id, districtId: districtPusat.id })),
      ...kurirList.slice(3, 7).map((k) => ({ courierId: k.id, districtId: districtSelatan.id })),
      ...kurirList.slice(6, 11).map((k) => ({ courierId: k.id, districtId: districtJauh.id })),
    ],
  });

  console.log("Seed selesai.");
  console.log("Password semua akun seed: password123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
