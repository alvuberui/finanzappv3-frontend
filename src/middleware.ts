// middleware.ts
import { auth } from "./app/lib/auth"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

function redirectToLogin(req: any) {
  const { pathname, searchParams } = req.nextUrl
  const url = req.nextUrl.clone()
  url.pathname = "/login"
  const qs = searchParams.toString()
  url.searchParams.set("callbackUrl", pathname + (qs ? `?${qs}` : ""))
  return NextResponse.redirect(url)
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // ✅ Rutas públicas (incluye "/")
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/_next")

  const isAppRoute = pathname.startsWith("/app")
  const isOnboardingPage = pathname.startsWith("/app/onboarding")

  // 1) Si NO está logueado y NO es pública -> login
  if (!isLoggedIn && !isPublic) {
    return redirectToLogin(req)
  }

  // ✅ 2) Si el token caduca, SOLO redirigir cuando estés en /app/**
  // (si estás en "/" u otra pública, NO redirige)
  if (isLoggedIn && isAppRoute) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return redirectToLogin(req)

    const tokenError = (token as any)?.error
    const accessToken = (token as any)?.accessToken
    const expiresAt = (token as any)?.expiresAt as number | undefined

    const isExpired =
      typeof expiresAt === "number" && Date.now() > expiresAt - 60_000

    if (
      tokenError === "RefreshAccessTokenError" ||
      tokenError === "NoRefreshToken" ||
      tokenError === "MissingKeycloakEnv" ||
      !accessToken ||
      isExpired
    ) {
      return redirectToLogin(req)
    }

    // 3) Gate de onboarding: solo si NO estás ya en onboarding
    if (!isOnboardingPage) {
      const email = req.auth?.user?.email
      if (email) {
        try {
          const apigateway = process.env.API_GATEWAY_URL
          const res = await fetch(
            `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(email)}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: "no-store",
            }
          )

          if (res.ok) {
            const data: { result: boolean } = await res.json()
            if (data.result === false) {
              const url = req.nextUrl.clone()
              url.pathname = "/app/onboarding"
              return NextResponse.redirect(url)
            }
          } else if (res.status === 401) {
            return redirectToLogin(req)
          }
        } catch (e) {
          console.error("Onboarding check failed", e)
        }
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  // ✅ excluye api/auth para no romper NextAuth
  matcher: ["/((?!api/auth|_next|favicon.ico|assets).*)"],
}
