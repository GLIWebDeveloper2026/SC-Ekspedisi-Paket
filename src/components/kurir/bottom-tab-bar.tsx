"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/kurir", label: "Resi" },
  { href: "/kurir/cod", label: "COD" },
  { href: "/kurir/riwayat", label: "Riwayat" },
  { href: "/kurir/profil", label: "Profil" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
