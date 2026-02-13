import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export async function GET(req: Request) {
  const session = await auth();

  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  if (!issuer) return NextResponse.redirect(new URL("/", req.url));

  // Keycloak logout:
  // end_session_endpoint suele ser: {issuer}/protocol/openid-connect/logout
  // con post_logout_redirect_uri para volver a tu app
  const postLogout = new URL("/", req.url);

  const url = new URL(`${issuer}/protocol/openid-connect/logout`);
  url.searchParams.set("post_logout_redirect_uri", postLogout.toString());

  // Si tienes id_token en token, Keycloak lo acepta como id_token_hint (mejor logout)
  const idToken = (session as any)?.idToken;
  if (idToken) url.searchParams.set("id_token_hint", idToken);

  return NextResponse.redirect(url);
}
