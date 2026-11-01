// src/app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { createUser, type OnboardingPayload } from "@/app/lib/api/user.client";
import { getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const POST = serverAuth(async (req) => {
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
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: { message: getErrorMessage(e, "Error interno") } },
      { status: 500 }
    );
  }
});
