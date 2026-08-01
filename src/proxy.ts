import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Rute yang tidak butuh login sama sekali. "/track" (pelacakan publik) sengaja
// masuk sini — orang luar (pengirim/penerima) harus bisa akses tanpa akun.
const PUBLIC_ROUTES = ["/login", "/track"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  const session = await auth();

  if (!session?.user && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cuma /login yang harus dijauhi kalau sudah login — /track tetap boleh
  // dibuka staff yang sedang login juga (bukan cuma orang luar).
  if (session?.user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Kurir selalu diarahkan ke PWA mobile "Mode Malam Jalan", bukan dashboard
  // desktop "Buku Ledger" — dua mode ini dipisah menurut konteks kerja masing-masing.
  if (session?.user?.role === "KURIR" && !pathname.startsWith("/kurir")) {
    return NextResponse.redirect(new URL("/kurir", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  // Aset statis di public/ (logo, background, ikon) HARUS bisa diakses tanpa
  // login — kalau tidak dikecualikan di sini, request gambarnya sendiri kena
  // redirect ke /login (jadi <img> nunjuk ke halaman HTML, bukan gambar),
  // dan itu tepatnya yang bikin logo/background halaman login sendiri patah.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};
