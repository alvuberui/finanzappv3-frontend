// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/lib/auth";

function redirectToHome(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Si ya estamos en la raíz, NO redirigimos (evita bucle)
  if (pathname === "/") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";

  const qs = searchParams.toString();
  url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));

  return NextResponse.redirect(url);
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // PROTEGER solo /app/**
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (!isAppRoute) return NextResponse.next();

  // Si no hay sesión -> a /
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) return redirectToHome(req);

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
