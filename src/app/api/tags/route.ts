// src/app/api/tags/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

type TagDto = {
  id: number;
  name: string;
  color: string;
};

type CreateTagIncoming = {
  name: string;
  color: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isHexColor(v: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

function backendUrl(path: string) {
  const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
  return `${baseUrl}${path}`;
}

export const GET = serverAuth(async (req) => {
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

    const url = backendUrl("/tag/tags");

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return await backendErrorResponse(res, "Error cargando las etiquetas");
    }

    const data = (await res.json()) as TagDto[];
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});

export const POST = serverAuth(async (req) => {
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

    const body = (await req.json().catch(() => null)) as CreateTagIncoming | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: { message: "Body inválido" } },
        { status: 400 }
      );
    }

    const { name, color } = body;

    if (!isNonEmptyString(name)) {
      return NextResponse.json(
        { ok: false, error: { message: "name inválido" } },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(color) || !isHexColor(color.trim())) {
      return NextResponse.json(
        { ok: false, error: { message: "color inválido (usa formato hexadecimal)" } },
        { status: 400 }
      );
    }

    const url = backendUrl("/tag/tags");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: name.trim(), color: color.trim() }),
      cache: "no-store",
    });

    if (!res.ok) {
      return await backendErrorResponse(res, "Error creando la etiqueta");
    }

    const data = (await res.json().catch(() => null)) as TagDto | null;
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
