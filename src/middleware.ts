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

async function getAnyToken(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

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

  // intento normal
  const t0 = await getToken({ req, secret }).catch(() => null);
  if (t0) return t0;

  // intento con cookieName explícito
  for (const cookieName of cookieCandidates) {
    const t = await getToken({ req, secret, cookieName }).catch(() => null);
    if (t) return t;
  }

  return null;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protege /app/**
  if (!(pathname === "/app" || pathname.startsWith("/app/"))) {
    return NextResponse.next();
  }

  const token = await getAnyToken(req);
  if (!token) return redirectToHome(req);

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
