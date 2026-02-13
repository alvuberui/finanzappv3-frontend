// src/middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  // Solo proteger /app/**
  if (!(pathname === "/app" || pathname.startsWith("/app/"))) {
    return NextResponse.next();
  }

  // Si NO hay sesión => home con callbackUrl
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    if (!url.searchParams.get("callbackUrl")) {
      const qs = searchParams.toString();
      url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
    }
    return NextResponse.redirect(url);
  }

  // Si token inválido / refresh fallido => home (regla #4)
  const tokenError = (req.auth as any)?.tokenError;
  if (tokenError) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    if (!url.searchParams.get("callbackUrl")) {
      const qs = searchParams.toString();
      url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
