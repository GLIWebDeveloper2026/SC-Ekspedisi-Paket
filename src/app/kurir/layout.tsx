import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { BottomTabBar } from "@/components/kurir/bottom-tab-bar";
import { SyncBadge } from "@/components/kurir/sync-badge";

export default async function KurirLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  const allowedRoles: Role[] = [Role.KURIR, Role.OWNER];
  if (!allowedRoles.includes(session.user.role)) redirect("/");

  return (
    <div className="dark-jalan min-h-screen bg-background text-foreground">
      <SyncBadge />
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-heading font-bold">Kilat Nusantara</span>
        <span className="text-xs text-muted-foreground">{session.user.name}</span>
      </header>
      <main className="px-4 py-4 pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
