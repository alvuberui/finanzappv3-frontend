// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

/**
 * Redirige a "/" (añadiendo callbackUrl) evitando bucles.
 */
function redirectToHome(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Si ya estamos en la raíz, NO redirigimos (evita bucle)
  if (pathname === "/") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";

  // Solo añadimos callbackUrl si no existe
  if (!url.searchParams.get("callbackUrl")) {
    const qs = searchParams.toString();
    url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""));
  }

  return NextResponse.redirect(url);
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // PROTEGER solo /app/**
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (!isAppRoute) return NextResponse.next();

  // Comprobamos token/session con next-auth
  try {
    const token = await getToken({ req, secret: NEXTAUTH_SECRET });

    // Si no hay token -> redirect to home (login entry)
    if (!token) {
      return redirectToHome(req);
    }

    // Si hay token, permitimos continuar
    return NextResponse.next();
  } catch (err) {
    // En caso de error al leer el token, mejor no bloquear toda la app; redirigimos al home
    console.error("middleware getToken error:", err);
    return redirectToHome(req);
  }
}

export const config = {
  matcher: ["/app/:path*"],
};
