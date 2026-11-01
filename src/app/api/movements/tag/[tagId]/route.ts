// src/app/api/movements/[tagId]/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, isValidYmd } from "@/app/lib/api/errors";

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

function parseId(idStr: string) {
  const n = Number(idStr);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function baseUrl() {
  return process.env.API_GATEWAY_URL ?? "http://localhost:8080";
}

type RouteContext = { params?: Promise<{ tagId?: string | string[] }> };

async function getParamAsString(ctx: RouteContext | undefined, name: "tagId"): Promise<string | undefined> {
  const raw = (await ctx?.params)?.[name];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  return undefined;
}

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

    const tagIdStr = await getParamAsString(ctx, "tagId");
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
        return await backendErrorResponse(res, "Error cargando el histórico");
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
      if (!isValidYmd(from) || !isValidYmd(to)) {
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
        return await backendErrorResponse(res, "Error cargando el resumen anual");
      }

      const data = (await res.json()) as AnualMovementResponseDto;
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    // --------------------------
    // LIST (movimientos por rango)
    // --------------------------
    if (!isValidYmd(from) || !isValidYmd(to)) {
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
      return await backendErrorResponse(res, "Error cargando los movimientos");
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
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
