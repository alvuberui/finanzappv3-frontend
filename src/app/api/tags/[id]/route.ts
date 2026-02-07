// app/api/tags/[id]/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/app/lib/auth";

async function requireAccessToken(req: any) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return (token as any)?.accessToken as string | undefined;
}

function parseId(idStr: string) {
  const n = Number(idStr);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function backendUrl(path: string) {
  const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8081";
  return `${baseUrl}${path}`;
}

/* =========================
 * GET tag by id
 * ========================= */
export const GET = auth(async (req, ctx) => {
  try {
    const userEmail = req.auth?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: { message: "No autenticado" } },
        { status: 401 }
      );
    }

    const accessToken = await requireAccessToken(req);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: { message: "Token inválido" } },
        { status: 401 }
      );
    }

    const params = await (ctx as any).params;
    const idStr = params?.id as string | undefined;

    const id = idStr ? parseId(idStr) : null;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: { message: "id inválido o faltante" } },
        { status: 400 }
      );
    }

    const url = backendUrl(`/tag/tags/${id}`);

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      const backendBody = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

      const backendMessage =
        backendBody && typeof backendBody === "object"
          ? (backendBody as any).message
          : undefined;

      return NextResponse.json(
        {
          ok: false,
          error: {
            message: backendMessage ?? `Backend error (${res.status})`,
            backend: backendBody || undefined,
            urlCalled: url,
          },
        },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});

/* =========================
 * DELETE tag
 * ========================= */
export const DELETE = auth(async (req, ctx) => {
  try {
    const userEmail = req.auth?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: { message: "No autenticado" } },
        { status: 401 }
      );
    }

    const accessToken = await requireAccessToken(req);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: { message: "Token inválido" } },
        { status: 401 }
      );
    }

    const params = await (ctx as any).params;
    const idStr = params?.id as string | undefined;

    const id = idStr ? parseId(idStr) : null;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: { message: "id inválido o faltante" } },
        { status: 400 }
      );
    }

    const url = backendUrl(`/tag/tags/${id}`);

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      const backendBody = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

      const backendMessage =
        backendBody && typeof backendBody === "object"
          ? (backendBody as any).message
          : undefined;

      return NextResponse.json(
        {
          ok: false,
          error: {
            message: backendMessage ?? `Backend error (${res.status})`,
            backend: backendBody || undefined,
            urlCalled: url,
          },
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
