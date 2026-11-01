import { NextResponse } from "next/server";

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function backendErrorResponse(
  response: Response,
  fallback = "Error comunicando con el backend"
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: `${fallback} (${response.status})`,
      },
    },
    { status: response.status }
  );
}

export function sameOriginFailure(request: Request): NextResponse | null {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin === requestOrigin) return null;
  if (referer) {
    try {
      if (new URL(referer).origin === requestOrigin) return null;
    } catch {
      return NextResponse.json(
        { ok: false, error: { message: "Solicitud no autorizada" } },
        { status: 403 }
      );
    }
  }

  return NextResponse.json(
    { ok: false, error: { message: "Solicitud no autorizada" } },
    { status: 403 }
  );
}
