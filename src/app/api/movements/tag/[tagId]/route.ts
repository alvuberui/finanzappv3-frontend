// src/app/api/movements/[tagId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

type BackendMovementType =
  | "BENEFIT"
  | "ESSENTIAL_EXPENSE"
  | "DISCRETIONARY_EXPENSE"
  | "INVESTMENT";

type FrontMovementType =
  | "BENEFIT"
  | "ESSENTIAL_EXPENSE"
  | "NOT_ESSENTIAL_EXPENSE"
  | "INVESTMENT";

type MovementResponseDto = {
  id: number;
  userEmail: string;
  movementType: BackendMovementType;
  amount: number;
  date: string; // YYYY-MM-DD
  tagId?: number | null;
  tagName?: string | null;
  tagColor?: string | null;
  description?: string | null;
};

type MonthDashboardDto = {
  month: number;
  monthName: string;
  idealAmount: number;
  realAmount: number;
};

type AnualMovementResponseDto = {
  movementType: string | null;
  year: number;
  series: MonthDashboardDto[];
};

type HistoricalDashboardDto = {
  year: number;
  idealAmount: number;
  realAmount: number;
};

type HistoricalMovementResponseDto = {
  metric: string;
  series: HistoricalDashboardDto[];
};

function mapBackendToFront(t: BackendMovementType): FrontMovementType {
  if (t === "DISCRETIONARY_EXPENSE") return "NOT_ESSENTIAL_EXPENSE";
  return t;
}

function isYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseId(idStr: string) {
  const n = Number(idStr);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function baseUrl() {
  return process.env.API_GATEWAY_URL ?? "http://localhost:8081";
}

function getParamAsString(ctx: any, name: string): string | undefined {
  const raw = ctx?.params?.[name];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  return undefined;
}

function backendError(resStatus: number, backendBody: any, url: string) {
  const backendMessage =
    backendBody && typeof backendBody === "object"
      ? (backendBody as any).message
      : undefined;

  return NextResponse.json(
    {
      ok: false,
      error: {
        message: backendMessage ?? `Backend error (${resStatus})`,
        backend: backendBody || undefined,
        urlCalled: url,
      },
    },
    { status: resStatus }
  );
}

export const GET = auth(async (req, ctx) => {
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

    const tagIdStr = getParamAsString(ctx, "tagId");
    const tagId = tagIdStr ? parseId(tagIdStr) : null;
    if (!tagId) {
      return NextResponse.json(
        { ok: false, error: { message: "tagId inválido" } },
        { status: 400 }
      );
    }

    const urlObj = new URL(req.url);

    // flags
    const annual = urlObj.searchParams.get("annual") === "1";
    const historical = urlObj.searchParams.get("historical") === "1";

    // params comunes
    const metric = urlObj.searchParams.get("metric") ?? undefined;
    const from = urlObj.searchParams.get("from") ?? undefined;
    const to = urlObj.searchParams.get("to") ?? undefined;

    const base = baseUrl();
    const basePath = `${base.replace(/\/$/, "")}/movement/movements`;

    // --------------------------
    // HISTORICAL
    // --------------------------
    if (historical) {
      if (!metric) {
        return NextResponse.json(
          { ok: false, error: { message: "metric es requerido para histórico" } },
          { status: 400 }
        );
      }

      const url = `${basePath}/historical/${tagId}?metric=${encodeURIComponent(metric)}`;

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
        return backendError(res.status, backendBody, url);
      }

      const data = (await res.json()) as HistoricalMovementResponseDto;
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    // --------------------------
    // ANNUAL
    // --------------------------
    if (annual) {
      if (!metric) {
        return NextResponse.json(
          { ok: false, error: { message: "metric es requerido para anual" } },
          { status: 400 }
        );
      }
      if (!isYmd(from) || !isYmd(to)) {
        return NextResponse.json(
          { ok: false, error: { message: "from/to requeridos con formato YYYY-MM-DD" } },
          { status: 400 }
        );
      }

      const url =
        `${basePath}/anual/${tagId}` +
        `?from=${encodeURIComponent(from as string)}` +
        `&to=${encodeURIComponent(to as string)}` +
        `&metric=${encodeURIComponent(metric as string)}`;

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
        return backendError(res.status, backendBody, url);
      }

      const data = (await res.json()) as AnualMovementResponseDto;
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    // --------------------------
    // LIST (movimientos por rango)
    // --------------------------
    if (!isYmd(from) || !isYmd(to)) {
      return NextResponse.json(
        { ok: false, error: { message: "from y to son requeridos (YYYY-MM-DD)" } },
        { status: 400 }
      );
    }

    const url =
      `${basePath}/tag/${tagId}` +
      `?from=${encodeURIComponent(from as string)}` +
      `&to=${encodeURIComponent(to as string)}`;

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
      return backendError(res.status, backendBody, url);
    }

    const data = (await res.json()) as MovementResponseDto[];

    // mapeo front-friendly
    const mapped = (data ?? []).map((m) => ({
      ...m,
      movementType: mapBackendToFront(m.movementType),
      tagId: m.tagId ?? null,
      tagName: m.tagName ?? null,
      tagColor: m.tagColor ?? null,
      description: m.description ?? "",
    }));

    return NextResponse.json({ ok: true, data: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
