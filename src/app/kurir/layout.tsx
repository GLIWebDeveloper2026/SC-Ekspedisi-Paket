import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/kurir/bottom-tab-bar";
import { SyncBadge } from "@/components/kurir/sync-badge";
import { NotificationBell } from "@/components/notification-bell";

export default async function KurirLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  const allowedRoles: Role[] = [Role.KURIR, Role.OWNER];
  if (!allowedRoles.includes(session.user.role)) redirect("/");

  return (
    <div className="dark-jalan min-h-screen bg-background text-foreground">
      <SyncBadge />
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-lampu-natrium/15 text-lampu-natrium">
            <Package className="size-4" />
          </div>
          <span className="font-heading font-bold">Kilat Nusantara</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{session.user.name}</span>
          <NotificationBell dark />
        </div>
      </header>
      <main className="px-4 py-4 pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
