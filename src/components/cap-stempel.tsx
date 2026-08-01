"use client";

import { useEffect } from "react";

interface CapStempelProps {
  show: boolean;
  label: string;
  onDone?: () => void;
}

/**
 * Momen konfirmasi final (terkirim, setoran cocok, lunas) — dipakai HEMAT,
 * bukan di semua tempat. Lihat docs/10-UIUX-DESIGN-SYSTEM.md.
 */
export function CapStempel({ show, label, onDone }: CapStempelProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onDone?.(), 1400);
    return () => clearTimeout(timer);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center">
      <div className="cap-stempel-mark flex h-32 w-32 items-center justify-center rounded-full border-4 border-stempel text-center font-heading text-sm font-bold tracking-widest text-stempel uppercase">
        {label}
      </div>
    </div>
  );
}
