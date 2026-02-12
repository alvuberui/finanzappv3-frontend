// src/app/api/tu-ruta-de-debug/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export const GET = auth(async (req) => {
  try {
    // Leer token/claims desde la sesión que inyecta `auth(...)`
    const access = (req.auth as any)?.accessToken as string | undefined;
    const expiresAt = (req.auth as any)?.expiresAt as number | undefined;

    if (!access) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (typeof expiresAt === "number" && Date.now() >= expiresAt) {
      return NextResponse.json({ error: "access token expired" }, { status: 401 });
    }

    // URL de userinfo (intenta ambas env names por compatibilidad)
    const issuer = process.env.KEYCLOAK_ISSUER ?? process.env.AUTH_KEYCLOAK_ISSUER;
    if (!issuer) {
      return NextResponse.json({ error: "KEYCLOAK_ISSUER no configurado" }, { status: 500 });
    }
    const userinfoUrl = `${issuer.replace(/\/$/, "")}/protocol/openid-connect/userinfo`;

    const resp = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });

    const ct = resp.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const json = await resp.json();
      return NextResponse.json({ source: "userinfo", user: json }, { status: resp.status });
    }

    const text = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "userinfo not json", status: resp.status, body: text.slice(0, 200) },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
});
