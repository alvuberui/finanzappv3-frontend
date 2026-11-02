// src/app/api/ideal-percentage/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage } from "@/app/lib/api/errors";

type IdealPercentage = {
  monthlySavingPercentage: number;
  monthlyNecessaryExpensesPercentage: number;
  monthlyDiscretionaryExpensesPercentage: number;
  monthlyInvestmentPercentage: number;
};

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

    const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
    const url = `${baseUrl}/user/users/idealPercentage`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return await backendErrorResponse(res, "Error obteniendo los porcentajes ideales");
    }

    const data = (await res.json()) as IdealPercentage;
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
