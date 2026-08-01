import { offlineDb, type PendingCodRemit, type PendingDeliveryAttempt } from "./db";

export function enqueueDeliveryAttempt(input: Omit<PendingDeliveryAttempt, "id" | "createdAt">) {
  return offlineDb.deliveryAttempts.add({ ...input, createdAt: Date.now() });
}

export function enqueueCodRemit(input: Omit<PendingCodRemit, "id" | "createdAt">) {
  return offlineDb.codRemits.add({ ...input, createdAt: Date.now() });
}

export function listPendingDeliveryAttempts() {
  return offlineDb.deliveryAttempts.orderBy("createdAt").reverse().toArray();
}

export function listPendingCodRemits() {
  return offlineDb.codRemits.orderBy("createdAt").reverse().toArray();
}

export async function countPending() {
  const [attempts, remits] = await Promise.all([
    offlineDb.deliveryAttempts.count(),
    offlineDb.codRemits.count(),
  ]);
  return attempts + remits;
}
