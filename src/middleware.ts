// middleware.ts
import { auth } from "./app/lib/auth";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function redirectToLogin(req: any) {
  const { pathname, searchParams } = req.nextUrl;
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  const qs = searchParams.toString();
  url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
  return NextResponse.redirect(url);
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // ✅ Rutas públicas SIEMPRE (no redirigir nunca desde aquí)
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets");

  // ✅ Solo protegemos /app/**
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  // 0) Si es pública -> dejar pasar siempre
  if (isPublic) return NextResponse.next();

  // 1) Si NO está logueado y quiere entrar a /app/** -> login
  if (!isLoggedIn && isAppRoute) {
    return redirectToLogin(req);
  }

  // 2) Si está logueado y está en /app/** -> validar token y onboarding
  if (isLoggedIn && isAppRoute) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return redirectToLogin(req);

    const tokenError = (token as any)?.error;
    const accessToken = (token as any)?.accessToken;
    const expiresAt = (token as any)?.expiresAt as number | undefined;

    const isExpired =
      typeof expiresAt === "number" && Date.now() > expiresAt - 60_000;

    if (
      tokenError === "RefreshAccessTokenError" ||
      tokenError === "NoRefreshToken" ||
      tokenError === "MissingKeycloakEnv" ||
      !accessToken ||
      isExpired
    ) {
      return redirectToLogin(req);
    }

    // Gate de onboarding (solo si NO estás ya en onboarding)
    const isOnboardingPage = pathname.startsWith("/app/onboarding");
    if (!isOnboardingPage) {
      const email = req.auth?.user?.email;
      if (email) {
        try {
          const apigateway = process.env.API_GATEWAY_URL;
          const res = await fetch(
            `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(
              email
            )}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: "no-store",
            }
          );

          if (res.ok) {
            const data: { result: boolean } = await res.json();
            if (data.result === false) {
              const url = req.nextUrl.clone();
              url.pathname = "/app/onboarding";
              return NextResponse.redirect(url);
            }
          } else if (res.status === 401) {
            return redirectToLogin(req);
          }
        } catch (e) {
          console.error("Onboarding check failed", e);
        }
      }
    }
  }

  // 3) Para cualquier otra ruta NO pública (si tienes /about, etc.), de momento dejamos pasar
  return NextResponse.next();
});

export const config = {
  // ✅ importante: aplica middleware a todo, pero nosotros decidimos en código qué proteger
  matcher: ["/((?!api/auth|_next|favicon.ico).*)"],
};
