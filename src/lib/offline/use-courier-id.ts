"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kilat-kurir-courier-id";

/**
 * Skema tidak menghubungkan User (role KURIR) ke entitas Courier secara langsung
 * (lihat 03-SKEMA-DATABASE.md — jangan diubah tanpa diskusi tim). Sebagai gantinya,
 * kurir memilih identitas Courier-nya sekali di perangkat, disimpan di localStorage.
 */
export function useCourierId() {
  const [courierId, setCourierIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCourierIdState(localStorage.getItem(STORAGE_KEY));
    setHydrated(true);
  }, []);

  function setCourierId(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setCourierIdState(id);
  }

  return { courierId, setCourierId, hydrated };
}
