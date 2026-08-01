import { PrismaClient, Role, ServiceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const districtKota = await prisma.district.create({
    data: { name: "Kecamatan Kota", isZonaJauh: false },
  });
  const districtJauh = await prisma.district.create({
    data: { name: "Kecamatan Perbatasan", isZonaJauh: true },
  });

  const agent = await prisma.agent.create({
    data: { name: "Agen Loket Pusat", districtId: districtKota.id },
  });

  const warehouse = await prisma.warehouse.create({
    data: { name: "Gudang Transit Utama" },
  });

  const courier = await prisma.courier.create({
    data: { name: "Kurir Andi", warehouseId: warehouse.id },
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

  await prisma.user.createMany({
    data: [
      { name: "Owner Kilat", email: "owner@kilat.test", passwordHash, role: Role.OWNER },
      {
        name: "Admin Pusat",
        email: "admin@kilat.test",
        passwordHash,
        role: Role.ADMIN_PUSAT,
      },
      {
        name: "Petugas Loket",
        email: "loket@kilat.test",
        passwordHash,
        role: Role.PETUGAS_LOKET,
        agentId: agent.id,
      },
      {
        name: "Kepala Gudang",
        email: "gudang@kilat.test",
        passwordHash,
        role: Role.KEPALA_GUDANG,
        warehouseId: warehouse.id,
      },
      {
        name: "Kurir Andi",
        email: "kurir@kilat.test",
        passwordHash,
        role: Role.KURIR,
        warehouseId: warehouse.id,
      },
    ],
  });

  console.log("Seed selesai.");
  console.log(`Courier id (untuk testing delivery-attempt/COD): ${courier.id}`);
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
