// src/app/api/user/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

/**
 * Backend:
 *  GET  /users/   -> UserDto
 *  PUT  /users/   -> void
 *
 * BACKEND_URL ejemplo:
 *  https://api.midominio.com/user
 * (el endpoint final será /user/users/)
 */

const BACKEND_URL = process.env.API_GATEWAY_URL;
const USERS_URL = () => `${BACKEND_URL}/user/users/`;

export const GET = serverAuth(async (req) => {
  try {
    const email = req.auth?.user?.email;
    const accessToken = req.auth?.accessToken;

    if (!email) {
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

    if (!BACKEND_URL) {
      return NextResponse.json(
        { ok: false, error: { message: "BACKEND_URL no configurada" } },
        { status: 500 }
      );
    }

    const res = await fetch(USERS_URL(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return await backendErrorResponse(res, "Error obteniendo el usuario");
    }

    const data = await res.json().catch(() => null);

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});

export const PUT = serverAuth(async (req) => {
  try {
    const originFailure = sameOriginFailure(req);
    if (originFailure) return originFailure;

    const email = req.auth?.user?.email;
    const accessToken = req.auth?.accessToken;

    if (!email) {
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

    if (!BACKEND_URL) {
      return NextResponse.json(
        { ok: false, error: { message: "BACKEND_URL no configurada" } },
        { status: 500 }
      );
    }

    /**
     * Body = UpdateUserRequestDto
     */
    const body = await req.json();

    const res = await fetch(USERS_URL(), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // updateUser devuelve void, pero por si hay body
    if (!res.ok) {
      return await backendErrorResponse(res, "Error actualizando el usuario");
    }

    return NextResponse.json({ ok: true, data: null }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
