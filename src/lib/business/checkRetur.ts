import { MAX_DELIVERY_ATTEMPTS_BEFORE_RETUR, RETUR_DAYS_THRESHOLD } from "./config";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Resi jadi kandidat retur setelah RETUR_DAYS_THRESHOLD hari sejak dibuat.
 * Boundary persis di hari ke-N dihitung SUDAH eligible ("setelah 7 hari" ditafsirkan
 * sebagai genap 7x24 jam berlalu, bukan menunggu ke hari ke-8).
 */
export function isEligibleForReturn(
  createdAt: Date,
  now: Date,
  thresholdDays: number = RETUR_DAYS_THRESHOLD,
): boolean {
  const diffDays = (now.getTime() - createdAt.getTime()) / MS_PER_DAY;
  return diffDays >= thresholdDays;
}

export type DeliveryResultLike = "BERHASIL" | "GAGAL" | "DITITIP_PIHAK_KETIGA";

/**
 * 3x GAGAL berturut-turut (dihitung dari attempt paling baru mundur ke belakang,
 * berhenti begitu ketemu hasil selain GAGAL) memicu retur otomatis ke gudang.
 */
export function shouldTriggerAutoReturn(
  pastAttemptResults: DeliveryResultLike[],
  newAttemptResult: DeliveryResultLike,
  maxAttempts: number = MAX_DELIVERY_ATTEMPTS_BEFORE_RETUR,
): boolean {
  const allResults = [...pastAttemptResults, newAttemptResult];

  let consecutiveFailures = 0;
  for (let i = allResults.length - 1; i >= 0; i--) {
    if (allResults[i] === "GAGAL") {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return consecutiveFailures >= maxAttempts;
}
