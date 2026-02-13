// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function redirectToHome(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === "/") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";

  if (!url.searchParams.get("callbackUrl")) {
    const qs = searchParams.toString();
    url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
  }

  return NextResponse.redirect(url);
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo protege /app/**
  if (!(pathname === "/app" || pathname.startsWith("/app/"))) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET; // usa este (tu auth.ts ya lo usa)
  const token = await getToken({ req, secret }).catch(() => null);

  // no sesión => fuera
  if (!token) return redirectToHome(req);

  // sesión “rota” (refresh fallido / sin refresh) => tratar como no autenticado (regla #4)
  if ((token as any).error === "RefreshAccessTokenError" || (token as any).error === "NoRefreshToken") {
    return redirectToHome(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
