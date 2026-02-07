// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "./app/lib/auth";

function redirectToLogin(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const url = req.nextUrl.clone();
  url.pathname = "/login";

  const qs = searchParams.toString();
  url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
  return NextResponse.redirect(url);
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  );
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 0) públicas -> pasar
  if (isPublicPath(pathname)) return NextResponse.next();

  // solo protegemos /app/**
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  if (!isAppRoute) return NextResponse.next();

  // 1) no logueado -> login
  if (!isLoggedIn) return redirectToLogin(req);

  // 2) validar token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return redirectToLogin(req);

  const tokenObj = token as {
    error?: string;
    accessToken?: string;
    expiresAt?: number;
  };

  const isExpired =
    typeof tokenObj.expiresAt === "number" &&
    Date.now() > tokenObj.expiresAt - 60_000;

  if (
    tokenObj.error === "RefreshAccessTokenError" ||
    tokenObj.error === "NoRefreshToken" ||
    tokenObj.error === "MissingKeycloakEnv" ||
    !tokenObj.accessToken ||
    isExpired
  ) {
    return redirectToLogin(req);
  }

  // 3) onboarding gate (con timeout y sin romper si falla)
  const isOnboardingPage = pathname.startsWith("/app/onboarding");
  if (!isOnboardingPage) {
    const email = req.auth?.user?.email;
    const apigateway = process.env.API_GATEWAY_URL;

    // Si no hay API_GATEWAY_URL en el entorno, no bloquees la app.
    if (email && apigateway) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2500); // 2.5s max
        const res = await fetch(
          `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(
            email
          )}`,
          {
            headers: { Authorization: `Bearer ${tokenObj.accessToken}` },
            cache: "no-store",
            signal: controller.signal,
          }
        );
        clearTimeout(t);

        if (res.ok) {
          const data = (await res.json()) as { result: boolean };
          if (data.result === false) {
            const url = req.nextUrl.clone();
            url.pathname = "/app/onboarding";
            return NextResponse.redirect(url);
          }
        } else if (res.status === 401) {
          return redirectToLogin(req);
        }
      } catch {
        // si falla el check, NO rompas navegación (solo no rediriges)
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next|favicon.ico).*)"],
};
