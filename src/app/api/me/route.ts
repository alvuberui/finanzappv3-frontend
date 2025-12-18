import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  if (!(token as any)?.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const access = (token as any).accessToken as string
  const expiresAt = (token as any).expiresAt as number

  if (Date.now() >= expiresAt) {
    return NextResponse.json({ error: "access token expired (dev)" }, { status: 401 })
  }

  // Probar contra /userinfo de Keycloak
  const userinfoUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`
  const resp = await fetch(userinfoUrl, { headers: { Authorization: `Bearer ${access}` } })

  const ct = resp.headers.get("content-type") || ""
  if (ct.includes("application/json")) {
    const json = await resp.json()
    return NextResponse.json({ source: "userinfo", user: json })
  }
  const text = await resp.text().catch(() => "")
  return NextResponse.json({ error: "userinfo not json", status: resp.status, body: text.slice(0, 200) }, { status: 502 })
}
