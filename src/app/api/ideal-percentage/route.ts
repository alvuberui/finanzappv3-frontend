// app/api/ideal-percentage/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/app/lib/auth";

type IdealPercentage = {
  monthlySavingPercentage: number;
  monthlyNecessaryExpensesPercentage: number;
  monthlyDiscretionaryExpensesPercentage: number;
  monthlyInvestmentPercentage: number;
};

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

    const baseUrl = process.env.API_GATEWAY_URL ?? "http://localhost:8081";
    const url = `${baseUrl}/user/users/idealPercentage`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

    const data = (await res.json()) as IdealPercentage;
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
