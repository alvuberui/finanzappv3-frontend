import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/lib/auth";

function redirectToHome(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const url = req.nextUrl.clone();
  url.pathname = "/";

  // guardamos a dónde quería ir
  const qs = searchParams.toString();
  url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));

  return NextResponse.redirect(url);
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Solo protegemos /app/**
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (!isAppRoute) return NextResponse.next();

  // Si no hay sesión -> a /
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) return redirectToHome(req);

  return NextResponse.next();
});

// IMPORTANTÍSIMO: el middleware solo se ejecuta en /app/**
export const config = {
  matcher: ["/app/:path*"],
};
