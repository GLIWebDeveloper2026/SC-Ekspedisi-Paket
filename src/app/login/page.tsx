"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Email atau password salah");
      return;
    }

    // Sengaja TIDAK setLoading(false) di sini — biar tombol tetap kelihatan
    // "Masuk..." sampai halaman benar-benar pindah (component ini unmount),
    // bukan balik ke "Masuk" duluan lalu layar kosong nunggu transisi.
    router.push(searchParams.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night p-4">
      {/* Foto gudang asli — diburamkan supaya kartu login tetap terbaca */}
      <Image
        src="/bg-login.png"
        alt=""
        fill
        priority
        className="scale-105 object-cover blur-sm"
      />
      <div className="pointer-events-none absolute inset-0 bg-night/60" />

      <Card className="relative w-full max-w-sm rounded-2xl border-0 shadow-2xl">
        <CardHeader className="items-center pb-2 text-center">
          <Image
            src="/logo-bolt.png"
            alt="Kilat Nusantara"
            width={64}
            height={64}
            priority
            className="mb-1 drop-shadow-[0_2px_10px_rgba(255,199,0,0.35)]"
          />
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Kilat Nusantara
          </p>
          <h1 className="font-heading text-2xl font-bold">Login</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Username</Label>
              <div className="relative">
                <User className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="loket@kilat.test"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9 pl-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="mt-2 gap-1.5 bg-lampu-natrium text-night hover:bg-lampu-natrium/90"
            >
              <LogIn className="size-4" />
              {loading ? "Masuk..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
