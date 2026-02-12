// src/app/app/page.tsx
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export default async function AppIndex() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/?callbackUrl=/app");
  }

  const apigateway = process.env.API_GATEWAY_URL;
  const email = session.user.email;
  const accessToken = (session as any).accessToken as string | undefined;

  // Si no podemos comprobar onboarding, lo tratamos como NO onboarded
  if (!apigateway || !accessToken) {
    redirect("/app/onboarding");
  }

  try {
    const res = await fetch(
      `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      redirect("/app/onboarding");
    }

    const data = (await res.json()) as { result?: boolean };

    if (data.result === false) {
      redirect("/app/onboarding");
    }

    // ✅ Usuario ya onboarded
    redirect("/app/user"); // cambia si quieres otra home
  } catch {
    redirect("/app/onboarding");
  }
}
