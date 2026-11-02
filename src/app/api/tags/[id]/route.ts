// src/app/api/tags/[id]/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

function parseId(idStr: string) {
  const n = Number(idStr);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function backendUrl(path: string) {
  const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
  return `${baseUrl}${path}`;
}

type RouteContext = { params?: Promise<{ id?: string | string[] }> };

async function getIdFromCtx(ctx: RouteContext | undefined): Promise<string | undefined> {
  const raw = (await ctx?.params)?.id;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

/* =========================
 * GET tag by id
 * ========================= */
export const GET = serverAuth(async (req, ctx: RouteContext) => {
  try {
    const userEmail = req.auth?.user?.email;
    const accessToken = req.auth?.accessToken;

    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: { message: "No autenticado" } },
        { status: 401 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: { message: "Token inválido (sin accessToken)" } },
        { status: 401 }
      );
    }

    const idStr = await getIdFromCtx(ctx);

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
      return await backendErrorResponse(res, "Error obteniendo la etiqueta");
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});

/* =========================
 * DELETE tag
 * ========================= */
export const DELETE = serverAuth(async (req, ctx: RouteContext) => {
  try {
    const originFailure = sameOriginFailure(req);
    if (originFailure) return originFailure;
    const userEmail = req.auth?.user?.email;
    const accessToken = req.auth?.accessToken;

    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: { message: "No autenticado" } },
        { status: 401 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: { message: "Token inválido (sin accessToken)" } },
        { status: 401 }
      );
    }

    const idStr = await getIdFromCtx(ctx);

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
      return await backendErrorResponse(res, "Error eliminando la etiqueta");
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
