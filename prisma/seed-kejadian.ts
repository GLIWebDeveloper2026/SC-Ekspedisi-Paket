import {
  PrismaClient,
  Role,
  ServiceType,
  CustodyEventType,
  DeliveryResult,
  RemitStatus,
  ReturnBorneBy,
  AdjustmentType,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Data skenario Kejadian A-F dari studi kasus, ditambahkan DI ATAS base seed
 * (prisma/seed.ts) — bukan menggantikannya. Dipisah jadi skrip sendiri
 * (bukan bagian dari main() di seed.ts) supaya bisa dijalankan sekali lagi
 * terhadap database yang base seed-nya SUDAH ada (mis. Supabase live),
 * tanpa menabrak unique constraint district/agent/email dari base seed.
 * Semua entitas dasar (kecamatan, agen, gudang, tarif, kurir) di-lookup,
 * bukan dibuat ulang.
 *
 * Jalankan: npx tsx prisma/seed-kejadian.ts
 */

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  const already = await prisma.resi.findFirst({ where: { noResi: "KEJADIAN-A-0001" } });
  if (already) {
    console.log("Skenario Kejadian A-F sudah pernah di-seed sebelumnya — lewati (idempotent guard).");
    return;
  }

  const districtPusat = await prisma.district.findFirstOrThrow({ where: { name: "Kecamatan Pusat" } });
  const districtSelatan = await prisma.district.findFirstOrThrow({ where: { name: "Kecamatan Selatan" } });
  const districtJauh = await prisma.district.findFirstOrThrow({ where: { name: "Kecamatan Perbatasan" } });
  const agentPusat = await prisma.agent.findFirstOrThrow({ where: { districtId: districtPusat.id } });
  const agentSelatan = await prisma.agent.findFirstOrThrow({ where: { districtId: districtSelatan.id } });
  const agentJauh = await prisma.agent.findFirstOrThrow({ where: { districtId: districtJauh.id } });
  const warehouse = await prisma.warehouse.findFirstOrThrow();
  const tariffReguler = await prisma.tariffRule.findFirstOrThrow({ where: { serviceType: ServiceType.REGULER } });
  const tariffKilat = await prisma.tariffRule.findFirstOrThrow({ where: { serviceType: ServiceType.KILAT } });
  const kepalaGudang = await prisma.user.findFirstOrThrow({ where: { role: Role.KEPALA_GUDANG } });
  const loketPusat = await prisma.user.findFirstOrThrow({ where: { email: "loket@kilat.test" } });
  const loketSelatan = await prisma.user.findFirstOrThrow({ where: { email: "loket3@kilat.test" } });
  const loketJauh = await prisma.user.findFirstOrThrow({ where: { email: "loket4@kilat.test" } });
  const kurirList = await prisma.user.findMany({ where: { role: Role.KURIR }, orderBy: { email: "asc" } });
  const kurirAndi = kurirList.find((k) => k.email === "kurir@kilat.test")!;

  const now = new Date();

  // ========================================================================
  // KEJADIAN A — kalkulasi ongkir volumetrik vs aktual
  // ========================================================================
  console.log("Seeding Kejadian A...");
  const resiA = await prisma.resi.create({
    data: {
      noResi: "KEJADIAN-A-0001",
      originAgentId: agentPusat.id,
      destinationDistrictId: districtSelatan.id,
      senderName: "Budi Santoso",
      senderPhone: "081234560001",
      recipientName: "Rina Wijaya",
      recipientAddress: "Jl. Melati No. 12, Kecamatan Selatan",
      serviceType: ServiceType.REGULER,
      beratAktualKg: 1.2,
      panjangCm: 60,
      lebarCm: 40,
      tinggiCm: 40,
      beratTertagihKg: 16, // MAX(1.2, (60*40*40)/6000=16) -> volumetrik menang
      tariffRuleId: tariffReguler.id,
      biayaDasar: 192000,
      biayaZona: 0,
      totalOngkir: 192000,
      itemDescription: "Kejadian A: berat aktual 1,2kg vs volumetrik 16kg — dipakai yang lebih besar",
    },
  });
  await prisma.packageCustodyEvent.create({
    data: { resiId: resiA.id, eventType: CustodyEventType.DIBUAT_DI_LOKET, actorUserId: loketPusat.id },
  });

  // ========================================================================
  // KEJADIAN B — koreksi pasca-cetak (timbang ulang di gudang)
  // ========================================================================
  console.log("Seeding Kejadian B...");
  const resiB = await prisma.resi.create({
    data: {
      noResi: "KEJADIAN-B-0001",
      originAgentId: agentSelatan.id,
      destinationDistrictId: districtPusat.id,
      senderName: "Dewi Lestari",
      senderPhone: "081234560002",
      recipientName: "Agus Setiawan",
      recipientAddress: "Jl. Kenanga No. 5, Kecamatan Pusat",
      serviceType: ServiceType.REGULER,
      // Field fisik SUDAH dikoreksi ke hasil timbang ulang (8kg) — tapi biaya
      // tetap terkunci ke perhitungan ASLI (5kg) saat resi dicetak; selisihnya
      // hidup di ResiAdjustment, bukan menimpa totalOngkir ini.
      beratAktualKg: 8,
      panjangCm: 30,
      lebarCm: 30,
      tinggiCm: 30,
      beratTertagihKg: 8,
      tariffRuleId: tariffReguler.id,
      biayaDasar: 60000,
      biayaZona: 0,
      totalOngkir: 60000,
      itemDescription: "Kejadian B: berat awal 5kg tertagih, timbang ulang di gudang jadi 8kg",
    },
  });
  const sackB = await prisma.sack.create({
    data: { originInfo: agentSelatan.name, destinationInfo: warehouse.name },
  });
  await prisma.sackItem.create({ data: { sackId: sackB.id, resiId: resiB.id } });
  const tB = addHours(now, -72);
  await prisma.packageCustodyEvent.createMany({
    data: [
      { resiId: resiB.id, eventType: CustodyEventType.DIBUAT_DI_LOKET, actorUserId: loketSelatan.id, timestamp: tB },
      {
        resiId: resiB.id,
        eventType: CustodyEventType.MASUK_KARUNG,
        toEntity: sackB.id,
        actorUserId: loketSelatan.id,
        timestamp: addHours(tB, 1),
      },
      {
        resiId: resiB.id,
        eventType: CustodyEventType.DIANGKUT_KE_GUDANG,
        fromEntity: agentSelatan.name,
        toEntity: warehouse.name,
        actorUserId: kurirList[3].id,
        timestamp: addHours(tB, 4),
      },
      {
        resiId: resiB.id,
        eventType: CustodyEventType.KELUAR_KARUNG,
        fromEntity: sackB.id,
        actorUserId: kepalaGudang.id,
        timestamp: addHours(tB, 6),
      },
      {
        resiId: resiB.id,
        eventType: CustodyEventType.MASUK_GUDANG,
        toEntity: warehouse.name,
        actorUserId: kepalaGudang.id,
        timestamp: addHours(tB, 6),
      },
    ],
  });
  await prisma.resiAdjustment.create({
    data: {
      resiId: resiB.id,
      adjustmentType: AdjustmentType.REWEIGH_DIFF,
      amount: 36000, // (8kg x 12000) - (5kg x 12000)
      reason: "Timbang ulang di gudang: 8kg (semula 5kg tertagih)",
    },
  });

  // ========================================================================
  // KEJADIAN C — titik "terkirim" dan bukti sengketa
  // ========================================================================
  console.log("Seeding Kejadian C...");
  // C1: dititip ke pihak ketiga (satpam kompleks) — TIDAK otomatis "terkirim"
  const resiC1 = await prisma.resi.create({
    data: {
      noResi: "KEJADIAN-C1-0001",
      originAgentId: agentPusat.id,
      destinationDistrictId: districtSelatan.id,
      senderName: "Herman Wijaya",
      senderPhone: "081234560003",
      recipientName: "Siti Aminah",
      recipientAddress: "Jl. Anggrek No. 8, Komplek Griya Asri, Kecamatan Selatan",
      serviceType: ServiceType.REGULER,
      beratAktualKg: 2,
      panjangCm: 20,
      lebarCm: 20,
      tinggiCm: 20,
      beratTertagihKg: 2,
      tariffRuleId: tariffReguler.id,
      biayaDasar: 24000,
      biayaZona: 0,
      totalOngkir: 24000,
    },
  });
  await prisma.packageCustodyEvent.createMany({
    data: [
      { resiId: resiC1.id, eventType: CustodyEventType.DIBUAT_DI_LOKET, actorUserId: loketPusat.id },
      {
        resiId: resiC1.id,
        eventType: CustodyEventType.DISERAHKAN_KE_KURIR,
        toEntity: kurirList[1].id,
        actorUserId: kepalaGudang.id,
      },
    ],
  });
  await prisma.deliveryAttempt.create({
    data: {
      resiId: resiC1.id,
      courierId: kurirList[1].id,
      attemptNumber: 1,
      result: DeliveryResult.DITITIP_PIHAK_KETIGA,
      thirdPartyFlag: true,
      thirdPartyName: "Pos Satpam Komplek Griya Asri",
      proofPhotoUrl: "keterangan: dititip ke pos satpam karena penerima tidak di rumah (bukti serah terima tertulis diarsip loket)",
    },
  });
  await prisma.packageCustodyEvent.create({
    data: {
      resiId: resiC1.id,
      eventType: CustodyEventType.DELIVERY_ATTEMPT,
      toEntity: kurirList[1].id,
      actorUserId: kurirList[1].id,
      notes: "Percobaan ke-1: DITITIP_PIHAK_KETIGA",
    },
  });

  // C2: gagal 3x berturut-turut -> retur otomatis ke gudang
  const resiC2 = await prisma.resi.create({
    data: {
      noResi: "KEJADIAN-C2-0001",
      originAgentId: agentPusat.id,
      destinationDistrictId: districtSelatan.id,
      senderName: "Wawan Kurnia",
      senderPhone: "081234560004",
      recipientName: "Fitri Handayani",
      recipientAddress: "Jl. Dahlia No. 3, Kecamatan Selatan",
      serviceType: ServiceType.REGULER,
      beratAktualKg: 1.5,
      panjangCm: 20,
      lebarCm: 20,
      tinggiCm: 20,
      beratTertagihKg: 1.5,
      tariffRuleId: tariffReguler.id,
      biayaDasar: 18000,
      biayaZona: 0,
      totalOngkir: 18000,
    },
  });
  await prisma.packageCustodyEvent.createMany({
    data: [
      { resiId: resiC2.id, eventType: CustodyEventType.DIBUAT_DI_LOKET, actorUserId: loketPusat.id },
      {
        resiId: resiC2.id,
        eventType: CustodyEventType.DISERAHKAN_KE_KURIR,
        toEntity: kurirList[2].id,
        actorUserId: kepalaGudang.id,
      },
    ],
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await prisma.deliveryAttempt.create({
      data: {
        resiId: resiC2.id,
        courierId: kurirList[2].id,
        attemptNumber: attempt,
        result: DeliveryResult.GAGAL,
        proofPhotoUrl: `keterangan: percobaan ke-${attempt} — penerima tidak ada di alamat`,
      },
    });
    await prisma.packageCustodyEvent.create({
      data: {
        resiId: resiC2.id,
        eventType: CustodyEventType.DELIVERY_ATTEMPT,
        toEntity: kurirList[2].id,
        actorUserId: kurirList[2].id,
        notes: `Percobaan ke-${attempt}: GAGAL`,
      },
    });
  }
  await prisma.packageCustodyEvent.create({
    data: {
      resiId: resiC2.id,
      eventType: CustodyEventType.RETUR_KE_GUDANG,
      actorUserId: kurirList[2].id,
      notes: "Otomatis: 3x percobaan antar gagal berturut-turut",
    },
  });

  // ========================================================================
  // KEJADIAN D — selisih karung (50 resi, 49 tercatat masuk gudang)
  // ========================================================================
  console.log("Seeding Kejadian D (50 resi)...");
  const sackD = await prisma.sack.create({
    data: { originInfo: agentJauh.name, destinationInfo: warehouse.name },
  });
  const resiDList = [];
  for (let i = 1; i <= 50; i++) {
    const r = await prisma.resi.create({
      data: {
        noResi: `KEJADIAN-D-${String(i).padStart(4, "0")}`,
        originAgentId: agentJauh.id,
        destinationDistrictId: districtJauh.id,
        senderName: `Pengirim Kejadian D #${i}`,
        senderPhone: "081234560005",
        recipientName: `Penerima Kejadian D #${i}`,
        recipientAddress: `Jl. Kejadian D No. ${i}, Kecamatan Perbatasan`,
        serviceType: ServiceType.REGULER,
        beratAktualKg: 1,
        panjangCm: 10,
        lebarCm: 10,
        tinggiCm: 10,
        beratTertagihKg: 1,
        tariffRuleId: tariffReguler.id,
        biayaDasar: 12000,
        biayaZona: 15000, // zona jauh
        totalOngkir: 27000,
      },
    });
    resiDList.push(r);
  }
  await prisma.sackItem.createMany({ data: resiDList.map((r) => ({ sackId: sackD.id, resiId: r.id })) });
  await prisma.packageCustodyEvent.createMany({
    data: resiDList.map((r) => ({
      resiId: r.id,
      eventType: CustodyEventType.DIBUAT_DI_LOKET,
      actorUserId: loketJauh.id,
    })),
  });
  await prisma.packageCustodyEvent.createMany({
    data: resiDList.map((r) => ({
      resiId: r.id,
      eventType: CustodyEventType.MASUK_KARUNG,
      toEntity: sackD.id,
      actorUserId: loketJauh.id,
    })),
  });
  // Seluruh 50 resi diangkut kurir yang sama ("Bang Jack") — inilah yang
  // membuat pemegang terakhir bisa dilacak begitu ada yang hilang.
  await prisma.packageCustodyEvent.createMany({
    data: resiDList.map((r) => ({
      resiId: r.id,
      eventType: CustodyEventType.DIANGKUT_KE_GUDANG,
      fromEntity: agentJauh.name,
      toEntity: warehouse.name,
      actorUserId: kurirAndi.id,
    })),
  });
  // HANYA 49 yang dikonfirmasi masuk gudang — 1 terakhir (indeks 49) sengaja
  // ditinggal supaya jadi kasus selisih yang terdeteksi Investigasi Selisih.
  const confirmedD = resiDList.slice(0, 49);
  await prisma.packageCustodyEvent.createMany({
    data: confirmedD.map((r) => ({
      resiId: r.id,
      eventType: CustodyEventType.KELUAR_KARUNG,
      fromEntity: sackD.id,
      actorUserId: kepalaGudang.id,
    })),
  });
  await prisma.packageCustodyEvent.createMany({
    data: confirmedD.map((r) => ({
      resiId: r.id,
      eventType: CustodyEventType.MASUK_GUDANG,
      toEntity: warehouse.name,
      actorUserId: kepalaGudang.id,
    })),
  });
  console.log(`  -> resi hilang (selisih): ${resiDList[49].noResi}, pemegang terakhir: ${kurirAndi.name}`);

  // ========================================================================
  // KEJADIAN E — COD, setoran kurang dari ekspektasi
  // ========================================================================
  console.log("Seeding Kejadian E...");
  const resiE = await prisma.resi.create({
    data: {
      noResi: "KEJADIAN-E-0001",
      originAgentId: agentSelatan.id,
      destinationDistrictId: districtPusat.id,
      senderName: "Toko Berkah Jaya",
      senderPhone: "081234560099",
      recipientName: "Yanto Kurniawan",
      recipientAddress: "Jl. Mawar No. 20, Kecamatan Pusat",
      serviceType: ServiceType.KILAT,
      beratAktualKg: 1.25,
      panjangCm: 15,
      lebarCm: 15,
      tinggiCm: 15,
      beratTertagihKg: 1.25,
      tariffRuleId: tariffKilat.id,
      biayaDasar: 25000,
      biayaZona: 0,
      totalOngkir: 25000,
      isCod: true,
      nilaiCod: 350000,
    },
  });
  await prisma.packageCustodyEvent.createMany({
    data: [
      { resiId: resiE.id, eventType: CustodyEventType.DIBUAT_DI_LOKET, actorUserId: loketSelatan.id },
      {
        resiId: resiE.id,
        eventType: CustodyEventType.DISERAHKAN_KE_KURIR,
        toEntity: kurirList[4].id,
        actorUserId: kepalaGudang.id,
      },
    ],
  });
  await prisma.deliveryAttempt.create({
    data: {
      resiId: resiE.id,
      courierId: kurirList[4].id,
      attemptNumber: 1,
      result: DeliveryResult.BERHASIL,
      recipientName: resiE.recipientName,
      proofPhotoUrl: "keterangan: diterima langsung oleh penerima",
    },
  });
  await prisma.packageCustodyEvent.createMany({
    data: [
      {
        resiId: resiE.id,
        eventType: CustodyEventType.DELIVERY_ATTEMPT,
        toEntity: kurirList[4].id,
        actorUserId: kurirList[4].id,
        notes: "Percobaan ke-1: BERHASIL",
      },
      {
        resiId: resiE.id,
        eventType: CustodyEventType.TERKIRIM,
        toEntity: resiE.recipientName,
        actorUserId: kurirList[4].id,
      },
    ],
  });
  // komisiPercent = 3% sesuai contoh di lembar jawaban (bukan KOMISI_DEFAULT_PERCENT
  // saat ini di config — dikunci manual di sini supaya angka demo = angka dokumen).
  await prisma.codCollection.create({
    data: {
      resiId: resiE.id,
      courierId: kurirList[4].id,
      collectedAmount: 350000,
      komisiPercent: 3,
      expectedRemit: 314500, // 350000 - 25000 - (350000*3%)
      remitStatus: RemitStatus.DISCREPANCY,
      remitAmount: 300000,
      discrepancyAmount: 14500,
      remittedAt: addHours(now, -6),
    },
  });

  // ========================================================================
  // KEJADIAN F — pembayaran batch 20 resi, 2 diretur (alamat tak ditemukan)
  // ========================================================================
  console.log("Seeding Kejadian F (20 resi)...");
  const resiFList = [];
  for (let i = 1; i <= 20; i++) {
    const r = await prisma.resi.create({
      data: {
        noResi: `KEJADIAN-F-${String(i).padStart(4, "0")}`,
        originAgentId: agentPusat.id,
        destinationDistrictId: districtSelatan.id,
        senderName: "Toko Sumber Rejeki",
        senderPhone: "081234560100",
        recipientName: `Pelanggan Kejadian F #${i}`,
        recipientAddress: `Jl. Sumber Rejeki No. ${i}, Kecamatan Selatan`,
        serviceType: ServiceType.REGULER,
        beratAktualKg: 2,
        panjangCm: 10,
        lebarCm: 10,
        tinggiCm: 10,
        beratTertagihKg: 2,
        tariffRuleId: tariffReguler.id,
        biayaDasar: 24000,
        biayaZona: 0,
        totalOngkir: 24000,
      },
    });
    resiFList.push(r);
  }
  await prisma.packageCustodyEvent.createMany({
    data: resiFList.map((r) => ({
      resiId: r.id,
      eventType: CustodyEventType.DIBUAT_DI_LOKET,
      actorUserId: loketPusat.id,
    })),
  });
  const paymentF = await prisma.paymentTransaction.create({
    data: {
      payerName: "Toko Sumber Rejeki",
      totalAmount: 480000, // 20 x 24000
      method: "CASH",
    },
  });
  await prisma.paymentTransactionItem.createMany({
    data: resiFList.map((r) => ({
      paymentTransactionId: paymentF.id,
      resiId: r.id,
      amountAllocated: 24000,
    })),
  });
  // 2 dari 20 resi: alamat tidak ditemukan -> gagal 3x -> retur, TANPA
  // mengubah PaymentTransaction atau 18 resi lainnya sama sekali.
  const resiFReturned = resiFList.slice(0, 2);
  for (const r of resiFReturned) {
    await prisma.packageCustodyEvent.create({
      data: {
        resiId: r.id,
        eventType: CustodyEventType.DISERAHKAN_KE_KURIR,
        toEntity: kurirList[5].id,
        actorUserId: kepalaGudang.id,
      },
    });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await prisma.deliveryAttempt.create({
        data: {
          resiId: r.id,
          courierId: kurirList[5].id,
          attemptNumber: attempt,
          result: DeliveryResult.GAGAL,
          proofPhotoUrl: "keterangan: alamat tidak ditemukan",
        },
      });
      await prisma.packageCustodyEvent.create({
        data: {
          resiId: r.id,
          eventType: CustodyEventType.DELIVERY_ATTEMPT,
          toEntity: kurirList[5].id,
          actorUserId: kurirList[5].id,
          notes: `Percobaan ke-${attempt}: GAGAL (alamat tidak ditemukan)`,
        },
      });
    }
    await prisma.packageCustodyEvent.create({
      data: {
        resiId: r.id,
        eventType: CustodyEventType.RETUR_KE_GUDANG,
        actorUserId: kurirList[5].id,
        notes: "Otomatis: 3x percobaan antar gagal berturut-turut (alamat tidak ditemukan)",
      },
    });
    await prisma.return.create({
      data: {
        resiId: r.id,
        reason: "Alamat tidak ditemukan",
        returnShippingCost: 24000,
        borneBy: ReturnBorneBy.PENGIRIM,
      },
    });
  }

  console.log("Seed skenario Kejadian A-F selesai.");
  console.log(`  Kejadian A: ${resiA.noResi} — Rp${Number(resiA.totalOngkir).toLocaleString("id-ID")}`);
  console.log(`  Kejadian B: ${resiB.noResi} — koreksi +Rp36.000 (ResiAdjustment)`);
  console.log(`  Kejadian C: ${resiC1.noResi} (titip pihak ketiga), ${resiC2.noResi} (gagal 3x -> retur)`);
  console.log(`  Kejadian D: Sack ${sackD.id} — 50 resi, 1 hilang (${resiDList[49].noResi})`);
  console.log(`  Kejadian E: ${resiE.noResi} — COD Rp350.000, setoran kurang Rp14.500`);
  console.log(`  Kejadian F: PaymentTransaction ${paymentF.id} — 20 resi, 2 diretur`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
