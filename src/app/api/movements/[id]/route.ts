// src/app/api/movements/[id]/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, isValidYmd, sameOriginFailure } from "@/app/lib/api/errors";

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

type BackendMovement = {
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

type EditMovementIncoming = {
  movementType: FrontMovementType;
  amount: number;
  date: string; // YYYY-MM-DD
  tagId?: number | null;
  description?: string | undefined;
};

type EditMovementToBackend = {
  movementType: BackendMovementType;
  amount: number;
  date: string;
  tagId?: number | null;
  description?: string;
};

function mapBackendToFront(t: BackendMovementType): FrontMovementType {
  if (t === "DISCRETIONARY_EXPENSE") return "NOT_ESSENTIAL_EXPENSE";
  return t;
}

function mapFrontToBackend(t: FrontMovementType): BackendMovementType {
  if (t === "NOT_ESSENTIAL_EXPENSE") return "DISCRETIONARY_EXPENSE";
  return t;
}

function todayISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseId(idStr: string) {
  const n = Number(idStr);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function baseUrl() {
  return process.env.API_GATEWAY_URL ?? "http://localhost:8080";
}

type RouteContext = { params?: Promise<{ id?: string | string[] }> };

async function getIdFromCtx(ctx: RouteContext | undefined): Promise<string | undefined> {
  const raw = (await ctx?.params)?.id;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

/* =========================
 * GET movement by id
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
        { ok: false, error: { message: "id inválido" } },
        { status: 400 }
      );
    }

    const url = `${baseUrl()}/movement/movements/${id}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) return await backendErrorResponse(res, "Error obteniendo el movimiento");

    const data = (await res.json()) as BackendMovement;

    const mapped = {
      ...data,
      movementType: mapBackendToFront(data.movementType),
      tagId: data.tagId ?? null,
      tagName: data.tagName ?? null,
      tagColor: data.tagColor ?? null,
      description: data.description ?? "",
    };

    return NextResponse.json({ ok: true, data: mapped }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});

/* =========================
 * PUT movement
 * ========================= */
export const PUT = serverAuth(async (req, ctx: RouteContext) => {
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
        { ok: false, error: { message: "id inválido" } },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as EditMovementIncoming | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: { message: "Body inválido" } },
        { status: 400 }
      );
    }

    const { movementType, amount, date, tagId, description } = body;

    const allowedTypes: FrontMovementType[] = [
      "BENEFIT",
      "ESSENTIAL_EXPENSE",
      "NOT_ESSENTIAL_EXPENSE",
      "INVESTMENT",
    ];
    if (!allowedTypes.includes(movementType)) {
      return NextResponse.json(
        { ok: false, error: { message: "movementType inválido" } },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: { message: "amount inválido (debe ser > 0)" } },
        { status: 400 }
      );
    }

    if (!isValidYmd(date)) {
      return NextResponse.json(
        { ok: false, error: { message: "date inválido (formato YYYY-MM-DD)" } },
        { status: 400 }
      );
    }

    if (date > todayISO()) {
      return NextResponse.json(
        { ok: false, error: { message: "La fecha no puede ser futura" } },
        { status: 400 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(body, "tagId")) {
      if (
        tagId !== null &&
        (typeof tagId !== "number" || !Number.isFinite(tagId) || tagId <= 0)
      ) {
        return NextResponse.json(
          { ok: false, error: { message: "tagId inválido (debe ser positivo o null)" } },
          { status: 400 }
        );
      }
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== "string") {
        return NextResponse.json(
          { ok: false, error: { message: "description inválida" } },
          { status: 400 }
        );
      }
      if (description.length > 255) {
        return NextResponse.json(
          { ok: false, error: { message: "La descripción no puede superar 255 caracteres" } },
          { status: 400 }
        );
      }
    }

    const url = `${baseUrl()}/movement/movements/${id}`;

    const payloadToBackend: EditMovementToBackend = {
      movementType: mapFrontToBackend(movementType),
      amount,
      date,
      ...(Object.prototype.hasOwnProperty.call(body, "tagId")
        ? { tagId: tagId === null ? null : tagId }
        : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadToBackend),
      cache: "no-store",
    });

    if (!res.ok) return await backendErrorResponse(res, "Error actualizando el movimiento");

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : null;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});

/* =========================
 * DELETE movement
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
        { ok: false, error: { message: "id inválido" } },
        { status: 400 }
      );
    }

    const url = `${baseUrl()}/movement/movements/${id}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) return await backendErrorResponse(res, "Error eliminando el movimiento");

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : null;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
