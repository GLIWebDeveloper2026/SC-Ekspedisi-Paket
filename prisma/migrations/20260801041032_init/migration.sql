-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN_PUSAT', 'PETUGAS_LOKET', 'KEPALA_GUDANG', 'KURIR');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('REGULER', 'KILAT', 'KARGO');

-- CreateEnum
CREATE TYPE "CustodyEventType" AS ENUM ('DIBUAT_DI_LOKET', 'MASUK_KARUNG', 'KELUAR_KARUNG', 'MASUK_GUDANG', 'KELUAR_GUDANG', 'DISERAHKAN_KE_KURIR', 'DIOPER_KE_KURIR_LAIN', 'DELIVERY_ATTEMPT', 'TERKIRIM', 'RETUR_KE_GUDANG', 'RETUR_KE_PENGIRIM');

-- CreateEnum
CREATE TYPE "DeliveryResult" AS ENUM ('BERHASIL', 'GAGAL', 'DITITIP_PIHAK_KETIGA');

-- CreateEnum
CREATE TYPE "RemitStatus" AS ENUM ('PENDING', 'REMITTED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('REWEIGH_DIFF', 'KOREKSI_LAIN');

-- CreateEnum
CREATE TYPE "ReturnBorneBy" AS ENUM ('PENGIRIM', 'PERUSAHAAN');

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isZonaJauh" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "warehouseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "agentId" TEXT,
    "warehouseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffRule" (
    "id" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "ratePerKg" DECIMAL(12,2) NOT NULL,
    "volumetricDivisor" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TariffRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneSurcharge" (
    "id" TEXT NOT NULL,
    "tariffRuleId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "surchargeAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ZoneSurcharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resi" (
    "id" TEXT NOT NULL,
    "noResi" TEXT NOT NULL,
    "originAgentId" TEXT NOT NULL,
    "destinationDistrictId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "beratAktualKg" DECIMAL(10,2) NOT NULL,
    "panjangCm" DECIMAL(10,2) NOT NULL,
    "lebarCm" DECIMAL(10,2) NOT NULL,
    "tinggiCm" DECIMAL(10,2) NOT NULL,
    "beratTertagihKg" DECIMAL(10,2) NOT NULL,
    "tariffRuleId" TEXT NOT NULL,
    "biayaDasar" DECIMAL(12,2) NOT NULL,
    "biayaZona" DECIMAL(12,2) NOT NULL,
    "totalOngkir" DECIMAL(12,2) NOT NULL,
    "isCod" BOOLEAN NOT NULL DEFAULT false,
    "nilaiCod" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sack" (
    "id" TEXT NOT NULL,
    "originInfo" TEXT NOT NULL,
    "destinationInfo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SackItem" (
    "sackId" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,

    CONSTRAINT "SackItem_pkey" PRIMARY KEY ("sackId","resiId")
);

-- CreateTable
CREATE TABLE "PackageCustodyEvent" (
    "id" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,
    "eventType" "CustodyEventType" NOT NULL,
    "fromEntity" TEXT,
    "toEntity" TEXT,
    "actorUserId" TEXT,
    "notes" TEXT,
    "evidenceUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageCustodyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "result" "DeliveryResult" NOT NULL,
    "recipientName" TEXT,
    "thirdPartyFlag" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyName" TEXT,
    "proofPhotoUrl" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodCollection" (
    "id" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "collectedAmount" DECIMAL(12,2) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "komisiPercent" DECIMAL(5,2) NOT NULL,
    "expectedRemit" DECIMAL(12,2) NOT NULL,
    "remitStatus" "RemitStatus" NOT NULL DEFAULT 'PENDING',
    "remitAmount" DECIMAL(12,2),
    "remittedAt" TIMESTAMP(3),
    "discrepancyAmount" DECIMAL(12,2),

    CONSTRAINT "CodCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransactionItem" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,
    "amountAllocated" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PaymentTransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResiAdjustment" (
    "id" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResiAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "resiId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "returnShippingCost" DECIMAL(12,2) NOT NULL,
    "borneBy" "ReturnBorneBy" NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TariffRule_serviceType_effectiveFrom_effectiveTo_idx" ON "TariffRule"("serviceType", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneSurcharge_tariffRuleId_districtId_key" ON "ZoneSurcharge"("tariffRuleId", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "Resi_noResi_key" ON "Resi"("noResi");

-- CreateIndex
CREATE INDEX "PackageCustodyEvent_resiId_timestamp_idx" ON "PackageCustodyEvent"("resiId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "CodCollection_resiId_key" ON "CodCollection"("resiId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courier" ADD CONSTRAINT "Courier_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneSurcharge" ADD CONSTRAINT "ZoneSurcharge_tariffRuleId_fkey" FOREIGN KEY ("tariffRuleId") REFERENCES "TariffRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneSurcharge" ADD CONSTRAINT "ZoneSurcharge_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resi" ADD CONSTRAINT "Resi_originAgentId_fkey" FOREIGN KEY ("originAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resi" ADD CONSTRAINT "Resi_tariffRuleId_fkey" FOREIGN KEY ("tariffRuleId") REFERENCES "TariffRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SackItem" ADD CONSTRAINT "SackItem_sackId_fkey" FOREIGN KEY ("sackId") REFERENCES "Sack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SackItem" ADD CONSTRAINT "SackItem_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageCustodyEvent" ADD CONSTRAINT "PackageCustodyEvent_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodCollection" ADD CONSTRAINT "CodCollection_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodCollection" ADD CONSTRAINT "CodCollection_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransactionItem" ADD CONSTRAINT "PaymentTransactionItem_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransactionItem" ADD CONSTRAINT "PaymentTransactionItem_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResiAdjustment" ADD CONSTRAINT "ResiAdjustment_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_resiId_fkey" FOREIGN KEY ("resiId") REFERENCES "Resi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
