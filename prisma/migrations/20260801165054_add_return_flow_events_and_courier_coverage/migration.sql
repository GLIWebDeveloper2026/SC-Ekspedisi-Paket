-- AlterEnum: leg retur (gudang -> agen asal -> pengirim)
ALTER TYPE "CustodyEventType" ADD VALUE 'DIANGKUT_KEMBALI_KE_AGEN';
ALTER TYPE "CustodyEventType" ADD VALUE 'DITERIMA_DI_AGEN_ASAL';

-- CreateTable: wilayah kurir (many-to-many kurir <-> kecamatan)
CREATE TABLE "CourierDistrictCoverage" (
    "courierId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,

    CONSTRAINT "CourierDistrictCoverage_pkey" PRIMARY KEY ("courierId","districtId")
);

-- AddForeignKey
ALTER TABLE "CourierDistrictCoverage" ADD CONSTRAINT "CourierDistrictCoverage_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierDistrictCoverage" ADD CONSTRAINT "CourierDistrictCoverage_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
