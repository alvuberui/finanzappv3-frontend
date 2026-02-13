import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // No autenticado => fuera
  if (!session?.user?.email) redirect("/?callbackUrl=/app/onboarding");

  // sesión rota => fuera
  const tokenError = (session as any).tokenError;
  const accessToken = (session as any).accessToken as string | undefined;
  if (tokenError || !accessToken) redirect("/?callbackUrl=/app/onboarding");

  const apigateway = process.env.API_GATEWAY_URL;
  if (!apigateway) redirect("/?callbackUrl=/app/onboarding");

  const res = await fetch(
    `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(session.user.email)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );

  if (!res.ok) redirect("/?callbackUrl=/app/onboarding");

  const data = (await res.json()) as { result: boolean };

  // 3) Si YA tiene perfil y entra aquí => a "/"
  if (data.result === true) redirect("/");

  // ✅ si no tiene perfil, puede ver onboarding
  return <>{children}</>;
}
