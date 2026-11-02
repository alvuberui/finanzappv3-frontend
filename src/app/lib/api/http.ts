// app/lib/api/http.ts
export type ApiError = {
  code?: string;
  message: string;
};

export type HttpResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiError };

type RequestOpts = {
  baseUrl: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken: string;
  body?: unknown;
};

export async function httpRequest<T = unknown>(
  opts: RequestOpts
): Promise<HttpResult<T>> {
  const res = await fetch(`${opts.baseUrl}${opts.path}`, {
    method: opts.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.accessToken}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text().catch(() => "");

  // ❌ ERROR
  if (!res.ok) {
    // Intenta parsear JSON estándar de Spring
    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(raw);
        return {
          ok: false,
          status: res.status,
          error: {
            message: json.message ?? "Error inesperado",
          },
        };
      } catch {
        // JSON inválido
      }
    }

    return {
      ok: false,
      status: res.status,
      error: {
        message: raw || `HTTP ${res.status}`,
      },
    };
  }

  // ✅ OK
  if (contentType.includes("application/json")) {
    try {
      return { ok: true, status: res.status, data: JSON.parse(raw) as T };
    } catch {
      return { ok: true, status: res.status, data: raw as T };
    }
  }

  return { ok: true, status: res.status, data: raw as T };
}
