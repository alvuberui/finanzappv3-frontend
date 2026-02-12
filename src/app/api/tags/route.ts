// src/app/api/tags/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

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

function backendUrl(path: string) {
  const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8081";
  return `${baseUrl}${path}`;
}

export const GET = auth(async (req) => {
  try {
    const userEmail = req.auth?.user?.email;
    const accessToken = (req.auth as any)?.accessToken as string | undefined;

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

    const data = (await res.json()) as TagDto[];
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});

export const POST = auth(async (req) => {
  try {
    const userEmail = req.auth?.user?.email;
    const accessToken = (req.auth as any)?.accessToken as string | undefined;

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

    if (!isNonEmptyString(color)) {
      return NextResponse.json(
        { ok: false, error: { message: "color inválido" } },
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

    const data = (await res.json().catch(() => null)) as TagDto | null;
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
