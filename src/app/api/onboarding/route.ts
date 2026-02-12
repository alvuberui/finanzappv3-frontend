// src/app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createUser, type OnboardingPayload } from "@/app/lib/api/user.client";

export const POST = auth(async (req) => {
  try {
    const email = req.auth?.user?.email;
    const accessToken = (req.auth as any)?.accessToken as string | undefined;

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

    const body = (await req.json()) as OnboardingPayload;
    body.email = email;

    const result = await createUser(body, accessToken);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: result.error.message ?? "No se pudo completar el onboarding" },
        },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Error interno" } },
      { status: 500 }
    );
  }
});
