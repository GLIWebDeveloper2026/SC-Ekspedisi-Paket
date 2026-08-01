"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/resi", label: "Resi" },
  { href: "/sacks", label: "Karung / Sack" },
  { href: "/delivery", label: "Delivery Attempt" },
  { href: "/cod", label: "COD" },
  { href: "/payments", label: "Pembayaran" },
  { href: "/returns", label: "Retur" },
  { href: "/tariffs", label: "Tarif", roles: ["OWNER"] as Role[] },
  { href: "/reports", label: "Laporan" },
];

export function SidebarNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: Role;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b p-4">
        <p className="font-heading font-bold">Kilat Nusantara</p>
        <p className="text-xs text-muted-foreground">{userName}</p>
        <p className="text-xs text-muted-foreground">{userRole}</p>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(userRole)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent",
              pathname === item.href && "bg-sidebar-accent font-medium",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t p-2">
        <Button variant="ghost" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/login" })}>
          Keluar
        </Button>
      </div>
    </aside>
  );
}
