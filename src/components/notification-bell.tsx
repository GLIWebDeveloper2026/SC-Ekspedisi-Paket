"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Bell notifikasi in-app, dipakai di sidebar dashboard maupun header kurir. */
export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<{ data: NotificationItem[]; unreadCount: number }>("/api/notifications"),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (body: { ids?: string[]; all?: boolean }) =>
      apiFetch("/api/notifications/mark-read", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifikasi"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-md transition-colors",
          dark
            ? "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-stempel text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup notifikasi"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifikasi</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-lampu-natrium hover:underline"
                  onClick={() => markReadMutation.mutate({ all: true })}
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
            {items.length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">Belum ada notifikasi.</p>
            )}
            <ul className="divide-y">
              {items.map((n) => {
                const row = (
                  <div
                    className={cn(
                      "flex flex-col gap-0.5 px-3 py-2.5 text-xs transition-colors hover:bg-muted/50",
                      !n.isRead && "bg-lampu-natrium/5",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-lampu-natrium" />}
                      <p className="font-medium">{n.title}</p>
                    </div>
                    <p className="text-muted-foreground">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {new Date(n.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (!n.isRead) markReadMutation.mutate({ ids: [n.id] });
                          setOpen(false);
                        }}
                      >
                        {row}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => !n.isRead && markReadMutation.mutate({ ids: [n.id] })}
                      >
                        {row}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
