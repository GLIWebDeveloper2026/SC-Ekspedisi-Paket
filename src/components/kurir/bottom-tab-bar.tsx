"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageSearch, Wallet, History, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/kurir", label: "Resi", icon: PackageSearch },
  { href: "/kurir/cod", label: "COD", icon: Wallet },
  { href: "/kurir/riwayat", label: "Riwayat", icon: History },
  { href: "/kurir/profil", label: "Profil", icon: CircleUser },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("size-5", active && "fill-primary/15")} strokeWidth={active ? 2.25 : 1.75} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
