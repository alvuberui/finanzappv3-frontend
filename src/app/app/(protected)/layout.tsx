import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { headers } from "next/headers";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/?callbackUrl=/app");
  }

  const h = await headers();
  const path = h.get("next-url") ?? "";
  const isOnboardingRoute = path.startsWith("/app/onboarding");

  const apigateway = process.env.API_GATEWAY_URL;
  const accessToken = (session as any).accessToken as string | undefined;
  console.log("[layout] email:", session.user.email);
  console.log("[layout] has accessToken:", Boolean(accessToken));
  console.log("[layout] tokenError:", (session as any).tokenError);
  // Si no puedo comprobar -> lo trato como NO onboarded
  if (!apigateway || !accessToken) {
    if (!isOnboardingRoute) redirect("/app/onboarding");
    return (
      <>
        <Navbar subtitle="Dashboard" />
        {children}
      </>
    );
  }

  try {
    const res = await fetch(
      `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(session.user.email)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );
    console.log("[layout] isOnboarded response status:", res);
    // Si falla la comprobación -> NO onboarded
    if (!res.ok) {
      if (!isOnboardingRoute) redirect("/app/onboarding");
    } else {
      const data = (await res.json()) as { result: boolean };

      // ✅ Caso: NO onboarded → fuera de onboarding => mandar a onboarding
      if (data.result === false) {
        if (!isOnboardingRoute) redirect("/app/onboarding");
      }

      // ✅ Caso: SÍ onboarded → si intenta onboarding => mandar a home privada
      if (data.result === true) {
        if (isOnboardingRoute) redirect("/app"); // o "/app/user"
      }
    }
  } catch {
    if (!isOnboardingRoute) redirect("/app/onboarding");
  }

  return (
    <>
      <Navbar subtitle="Dashboard" />
      {children}
    </>
  );
}
