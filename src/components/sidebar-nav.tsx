"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  PackageSearch,
  Boxes,
  Truck,
  Wallet,
  CreditCard,
  Undo2,
  Percent,
  BarChart3,
  Users,
  KeyRound,
  LogOut,
  Building2,
  Route,
  SearchCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resi", label: "Resi", icon: PackageSearch },
  { href: "/sacks", label: "Karung / Sack", icon: Boxes },
  {
    href: "/sortir",
    label: "Sortir & Assign Kurir",
    icon: Route,
    roles: ["OWNER", "KEPALA_GUDANG"] as Role[],
  },
  { href: "/delivery", label: "Delivery Attempt", icon: Truck, roles: ["OWNER"] as Role[] },
  { href: "/cod", label: "COD", icon: Wallet, roles: ["OWNER", "KEPALA_GUDANG"] as Role[] },
  { href: "/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/returns", label: "Retur", icon: Undo2 },
  { href: "/tariffs", label: "Tarif", icon: Percent, roles: ["OWNER"] as Role[] },
  { href: "/master-data", label: "Master Data", icon: Building2, roles: ["OWNER"] as Role[] },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  {
    href: "/investigasi-selisih",
    label: "Investigasi Selisih",
    icon: SearchCheck,
    roles: ["OWNER", "KEPALA_GUDANG"] as Role[],
  },
  {
    href: "/akun",
    label: "Kelola Akun",
    icon: Users,
    roles: ["OWNER", "KEPALA_GUDANG"] as Role[],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  PETUGAS_LOKET: "Petugas Loket",
  KEPALA_GUDANG: "Kepala Gudang",
  KURIR: "Kurir",
};

export function SidebarNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: Role;
}) {
  const pathname = usePathname();
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lampu-natrium/15">
          <Image src="/logo-bolt.png" alt="" width={22} height={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate font-bold leading-tight">Kilat Nusantara</p>
          <p className="text-[11px] text-muted-foreground">Ekspedisi & Penagihan</p>
        </div>
        <NotificationBell dark />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(userRole)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active && "border-lampu-natrium bg-sidebar-accent font-medium text-sidebar-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-lampu-natrium" : "text-sidebar-foreground/50")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Link
          href="/ganti-password"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            pathname === "/ganti-password" && "bg-sidebar-accent font-medium text-sidebar-foreground",
          )}
        >
          <KeyRound className="size-4 shrink-0 text-sidebar-foreground/50" />
          Ganti Password
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 text-sidebar-foreground/80 hover:text-stempel"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4 shrink-0" />
          Keluar
        </Button>

        <div className="mt-2 flex items-center gap-2.5 border-t px-1 pt-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terpal/15 text-sm font-semibold text-terpal">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABELS[userRole]}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
