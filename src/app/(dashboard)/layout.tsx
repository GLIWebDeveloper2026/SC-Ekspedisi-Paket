import { auth } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex h-dvh overflow-hidden">
      {session?.user && (
        <SidebarNav userName={session.user.name ?? session.user.email ?? ""} userRole={session.user.role} />
      )}
      <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
    </div>
  );
}
