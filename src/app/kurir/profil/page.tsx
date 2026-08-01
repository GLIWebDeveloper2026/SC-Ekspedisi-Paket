"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
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
          <div>
            <p className="font-heading font-bold">{profile?.name}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
            <Badge variant={profile?.isActive ? "default" : "destructive"} className="mt-1">
              {profile?.isActive ? "Akun aktif" : "Akun dinonaktifkan"}
            </Badge>
          </div>
          {profile?.warehouseName && (
            <p className="border-t border-border pt-2 text-xs text-muted-foreground">
              Gudang: {profile.warehouseName}
            </p>
          )}
        </CardContent>
      </Card>

      <Link href="/kurir/profil/ganti-password">
        <Button variant="outline" className="w-full justify-start">
          Ganti Password
        </Button>
      </Link>

      <Button variant="outline" className="w-full justify-start" onClick={() => setShowLogoutConfirm(true)}>
        Keluar
      </Button>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <Card className="w-full max-w-md rounded-b-none">
            <CardContent className="flex flex-col gap-4 pt-6">
              <p className="text-sm font-medium">Yakin mau keluar?</p>
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
