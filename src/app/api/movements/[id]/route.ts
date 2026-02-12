// src/app/api/movements/[id]/route.ts
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

function getIdFromCtx(ctx: any): string | undefined {
  const raw = ctx?.params?.id;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

/* =========================
 * GET movement by id
 * ========================= */
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

    const idStr = getIdFromCtx(ctx);
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

    const data = (await res.json()) as BackendMovement;

    const mapped = {
      ...data,
      movementType: mapBackendToFront(data.movementType),
      tagId: data.tagId ?? null,
      tagName: (data as any).tagName ?? null,
      tagColor: (data as any).tagColor ?? null,
      description: data.description ?? "",
    };

    return NextResponse.json({ ok: true, data: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});

/* =========================
 * PUT movement
 * ========================= */
export const PUT = auth(async (req, ctx) => {
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

    const idStr = getIdFromCtx(ctx);
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

    if (!isYmd(date)) {
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
      ...(description?.trim() ? { description: description.trim() } : {}),
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

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : null;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});

/* =========================
 * DELETE movement
 * ========================= */
export const DELETE = auth(async (req, ctx) => {
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

    const idStr = getIdFromCtx(ctx);
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

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : null;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
