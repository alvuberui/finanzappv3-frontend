// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function redirectToHome(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // evita bucle si ya estás en /
  if (pathname === "/") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";

  // añade callbackUrl solo si no existe
  if (!url.searchParams.get("callbackUrl")) {
    const qs = searchParams.toString();
    url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
  }

  return NextResponse.redirect(url);
}

async function getAnyToken(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  // Importante: en producción suele ser "__Secure-authjs.session-token" (NextAuth v5)
  // En dev: "authjs.session-token"
  // Y si fuera v4: "__Secure-next-auth.session-token" / "next-auth.session-token"
  const cookieCandidates =
    process.env.NODE_ENV === "production"
      ? [
          "__Secure-authjs.session-token",
          "authjs.session-token",
          "__Secure-next-auth.session-token",
          "next-auth.session-token",
        ]
      : [
          "authjs.session-token",
          "__Secure-authjs.session-token",
          "next-auth.session-token",
          "__Secure-next-auth.session-token",
        ];

  // 1) intenta primero sin cookieName (por si funciona con autodetección)
  try {
    const t0 = await getToken({ req, secret });
    if (t0) return t0;
  } catch {
    // seguimos probando candidatos
  }

  // 2) prueba candidatos explícitos
  for (const cookieName of cookieCandidates) {
    try {
      const t = await getToken({ req, secret, cookieName });
      if (t) return t;
    } catch {
      // intenta siguiente
    }
  }

  return null;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // proteger solo /app/**
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  if (!isAppRoute) return NextResponse.next();

  const token = await getAnyToken(req);

  // si no hay token -> fuera a /
  if (!token) return redirectToHome(req);

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
