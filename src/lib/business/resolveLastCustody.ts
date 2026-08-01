export interface CustodyEventLike {
  eventType: string;
  fromEntity?: string | null;
  toEntity?: string | null;
  timestamp: Date;
}

/**
 * Pemegang terakhir paket = event dengan timestamp terbesar, TERLEPAS dari urutan
 * event tersebut disimpan/diinput ke array. Jangan asumsikan array sudah terurut.
 */
export function resolveLastCustody<T extends CustodyEventLike>(events: T[]): T | null {
  if (!events || events.length === 0) return null;

  return events.reduce((latest, current) =>
    current.timestamp.getTime() > latest.timestamp.getTime() ? current : latest,
  );
}
