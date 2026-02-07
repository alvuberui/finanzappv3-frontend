// app/api/user/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/app/lib/auth";

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

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: data?.message ?? "Error obteniendo usuario" },
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});

export const PUT = auth(async (req) => {
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

    if (!BACKEND_URL) {
      return NextResponse.json(
        { ok: false, error: { message: "BACKEND_URL no configurada" } },
        { status: 500 }
      );
    }

    /**
     * Body = UpdateUserRequestDto
     * {
     *   name: string;
     *   lastname: string;
     *   birthdate: "yyyy-MM-dd";
     *   monthlySavingPercentage: number;
     *   monthlyNecessaryExpensesPercentage: number;
     *   monthlyDiscretionaryExpensesPercentage: number;
     *   monthlyInvestmentPercentage: number;
     * }
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
    const maybeJson = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: maybeJson?.message ?? "Error actualizando usuario" },
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, data: null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
