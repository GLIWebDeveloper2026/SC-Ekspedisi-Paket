import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  const session = await auth();

  if (!session?.user && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.user && isPublicRoute) {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
