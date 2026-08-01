"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CircleUser, KeyRound, LogOut, Building2, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useOnlineSync } from "@/lib/offline/use-online-sync";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProfileInfo {
  name: string;
  email: string;
  isActive: boolean;
  warehouseName: string | null;
}

export default function KurirProfilPage() {
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<ProfileInfo>("/api/account/me"),
  });
  const { pendingCount } = useOnlineSync();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lampu-natrium/15">
              <CircleUser className="size-5 text-lampu-natrium" />
            </div>
            <div>
              <p className="font-heading font-bold">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              <Badge variant={profile?.isActive ? "default" : "destructive"} className="mt-1">
                {profile?.isActive ? "Akun aktif" : "Akun dinonaktifkan"}
              </Badge>
            </div>
          </div>
          {profile?.warehouseName && (
            <p className="flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
              <Building2 className="size-3.5" />
              {profile.warehouseName}
            </p>
          )}
        </CardContent>
      </Card>

      <Link href="/kurir/profil/ganti-password">
        <Button variant="outline" className="w-full justify-start gap-2.5">
          <KeyRound className="size-4" />
          Ganti Password
        </Button>
      </Link>

      <Button
        variant="outline"
        className="w-full justify-start gap-2.5"
        onClick={() => setShowLogoutConfirm(true)}
      >
        <LogOut className="size-4" />
        Keluar
      </Button>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <Card className="w-full max-w-md rounded-b-none">
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Yakin mau keluar?</p>
                <button
                  type="button"
                  aria-label="Tutup"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              {pendingCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Masih ada <span className="font-medium text-primary">{pendingCount} laporan</span>{" "}
                  yang belum tersinkron ke server. Laporan tetap tersimpan di HP ini dan akan lanjut
                  terkirim otomatis begitu ada koneksi — baik kamu logout atau tidak.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Semua laporan sudah tersinkron. Aman untuk keluar.</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  Ya, keluar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
