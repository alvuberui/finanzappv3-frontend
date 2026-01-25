// app/api/movements/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/app/lib/auth";

type BackendMovement = {
  id: number;
  userEmail: string;
  movementType:
    | "BENEFIT"
    | "ESSENTIAL_EXPENSE"
    | "DISCRETIONARY_EXPENSE"
    | "INVESTMENT";
  amount: number;
  date: string; // YYYY-MM-DD

  tagId?: number | null;
  tagName?: string | null;
  tagColor?: string | null;

  description: string;
};

type BackendAnnualMetric =
  | "BENEFIT"
  | "TOTAL_EXPENSES"
  | "NECESSARY_EXPENSES"
  | "DISCRETIONARY_EXPENSES"
  | "INVESTMENTS"
  | "SAVINGS";

type BackendAnnualResponse = {
  movementType: string | null;
  year: number;
  series: Array<{
    month: number; // 1-12
    monthName: string;
    idealAmount: number;
    realAmount: number;
  }>;
};

type BackendHistoricalResponse = {
  metric: BackendAnnualMetric;
  series: Array<{
    year: number;
    idealAmount: number;
    realAmount: number;
  }>;
};

type FrontMovementType =
  | "BENEFIT"
  | "ESSENTIAL_EXPENSE"
  | "NOT_ESSENTIAL_EXPENSE"
  | "INVESTMENT";

type CreateMovementIncoming = {
  movementType: FrontMovementType;
  amount: number;
  date: string; // YYYY-MM-DD
  tagId?: number;
  description?: string;
};

type CreateMovementToBackend = {
  userEmail: string;
  movementType:
    | "BENEFIT"
    | "ESSENTIAL_EXPENSE"
    | "DISCRETIONARY_EXPENSE"
    | "INVESTMENT";
  amount: number;
  date: string;
  tagId?: number;
  description?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(year: number, monthIndex0: number, day: number) {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`;
}

function getMonthRange(year: number, monthIndex0: number) {
  const from = ymd(year, monthIndex0, 1);
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const to = ymd(year, monthIndex0, lastDay);
  return { from, to };
}

function isMetric(v: string | null): v is BackendAnnualMetric {
  return (
    v === "BENEFIT" ||
    v === "TOTAL_EXPENSES" ||
    v === "NECESSARY_EXPENSES" ||
    v === "DISCRETIONARY_EXPENSES" ||
    v === "INVESTMENTS" ||
    v === "SAVINGS"
  );
}

function mapMovementTypeToBackend(
  t: FrontMovementType
): CreateMovementToBackend["movementType"] {
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

/**
 * POST /api/movements
 */
export const POST = auth(async (req) => {
  try {
    const userEmail = req.auth?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: { message: "No autenticado" } },
        { status: 401 }
      );
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = (token as any)?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: { message: "Token inválido" } },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | CreateMovementIncoming
      | null;

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

    if (
      tagId !== undefined &&
      (typeof tagId !== "number" || !Number.isFinite(tagId) || tagId <= 0)
    ) {
      return NextResponse.json(
        { ok: false, error: { message: "tagId inválido (debe ser positivo)" } },
        { status: 400 }
      );
    }

    if (description !== undefined && typeof description !== "string") {
      return NextResponse.json(
        { ok: false, error: { message: "description inválida" } },
        { status: 400 }
      );
    }

    if (description && description.length > 255) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "La descripción no puede superar 255 caracteres",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8081";
    const url = `${baseUrl}/movement/movements`;

    const payloadToBackend: CreateMovementToBackend = {
      userEmail,
      movementType: mapMovementTypeToBackend(movementType),
      amount,
      date,
      ...(tagId ? { tagId } : {}),
      ...(description?.trim() ? { description: description.trim() } : {}),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadToBackend),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: `Backend error (${res.status})`,
            details: text || undefined,
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

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});

export const GET = auth(async (req) => {
  try {
    if (!req.auth?.user?.email) {
      return NextResponse.json(
        { ok: false, error: { message: "No autenticado" } },
        { status: 401 }
      );
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const accessToken = (token as any)?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: { message: "Token inválido" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8081";

    // ✅ MODO "SAVINGS": /api/movements?savings=1
    const savingsFlag = searchParams.get("savings");
    if (savingsFlag === "1" || savingsFlag === "true" || savingsFlag === "yes") {
      // Ajusta esta URL si tu gateway expone otra ruta
      const url = `${baseUrl}/movement/movements/savings`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `Backend error (${res.status})`,
              details: text || undefined,
              urlCalled: url,
            },
          },
          { status: res.status }
        );
      }

      // Backend devuelve Double -> puede venir como número o string según gateway
      const contentType = res.headers.get("content-type") ?? "";
      const raw = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

      const savings =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
          ? Number(raw)
          : raw;

      return NextResponse.json(
        { ok: true, data: savings, meta: { metric: "SAVINGS" } },
        { status: 200 }
      );
    }

    // ✅ MODO "YEARS": /api/movements?years=1
    const yearsFlag = searchParams.get("years");
    if (yearsFlag === "1" || yearsFlag === "true" || yearsFlag === "yes") {
      const url = `${baseUrl}/movement/movements/allYears`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `Backend error (${res.status})`,
              details: text || undefined,
              urlCalled: url,
            },
          },
          { status: res.status }
        );
      }

      const data = (await res.json()) as number[];
      data.sort((a, b) => a - b);
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    // ✅ MODO "ANNUAL": /api/movements?annual=1&year=YYYY&metric=BENEFIT
    const annualFlag = searchParams.get("annual");
    if (annualFlag === "1" || annualFlag === "true" || annualFlag === "yes") {
      const now = new Date();
      const year = Number(searchParams.get("year") ?? now.getFullYear());
      const metricRaw = searchParams.get("metric") ?? "BENEFIT";

      if (!Number.isFinite(year)) {
        return NextResponse.json(
          { ok: false, error: { message: "Parámetro year inválido" } },
          { status: 400 }
        );
      }

      if (!isMetric(metricRaw)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message:
                "Parámetro metric inválido. Usa: BENEFIT, TOTAL_EXPENSES, NECESSARY_EXPENSES, DISCRETIONARY_EXPENSES, INVESTMENTS, SAVINGS",
            },
          },
          { status: 400 }
        );
      }

      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      const url = `${baseUrl}/movement/movements/anual?from=${from}&to=${to}&metric=${encodeURIComponent(
        metricRaw
      )}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `Backend error (${res.status})`,
              details: text || undefined,
              urlCalled: url,
            },
          },
          { status: res.status }
        );
      }

      const data = (await res.json()) as BackendAnnualResponse;
      data.series?.sort((a, b) => a.month - b.month);

      return NextResponse.json(
        { ok: true, data, meta: { year, from, to, metric: metricRaw } },
        { status: 200 }
      );
    }

    // ✅ MODO "HISTORICAL": /api/movements?historical=1&metric=BENEFIT
    const historicalFlag = searchParams.get("historical");
    if (historicalFlag === "1" || historicalFlag === "true" || historicalFlag === "yes") {
      const metricRaw = searchParams.get("metric") ?? "BENEFIT";

      if (!isMetric(metricRaw)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message:
                "Parámetro metric inválido. Usa: BENEFIT, TOTAL_EXPENSES, NECESSARY_EXPENSES, DISCRETIONARY_EXPENSES, INVESTMENTS, SAVINGS",
            },
          },
          { status: 400 }
        );
      }

      const url = `${baseUrl}/movement/movements/historical?metric=${encodeURIComponent(
        metricRaw
      )}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `Backend error (${res.status})`,
              details: text || undefined,
              urlCalled: url,
            },
          },
          { status: res.status }
        );
      }

      const data = (await res.json()) as BackendHistoricalResponse;
      data.series?.sort((a, b) => a.year - b.year);

      return NextResponse.json(
        { ok: true, data, meta: { metric: metricRaw } },
        { status: 200 }
      );
    }

    // ✅ MODO "MOVEMENTS" mensual (default): /api/movements?year=YYYY&month=0-11
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const monthIndex0 = Number(searchParams.get("month") ?? now.getMonth()); // 0-11

    if (!Number.isFinite(year) || !Number.isFinite(monthIndex0)) {
      return NextResponse.json(
        { ok: false, error: { message: "Parámetros inválidos" } },
        { status: 400 }
      );
    }

    if (monthIndex0 < 0 || monthIndex0 > 11) {
      return NextResponse.json(
        { ok: false, error: { message: "month debe ser 0-11" } },
        { status: 400 }
      );
    }

    const { from, to } = getMonthRange(year, monthIndex0);
    const url = `${baseUrl}/movement/movements?from=${from}&to=${to}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: `Backend error (${res.status})`,
            details: text || undefined,
            urlCalled: url,
          },
        },
        { status: res.status }
      );
    }

    const data = (await res.json()) as BackendMovement[];

    data.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.id ?? 0) - (a.id ?? 0);
    });

    return NextResponse.json(
      { ok: true, data, meta: { year, month: monthIndex0, from, to } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
