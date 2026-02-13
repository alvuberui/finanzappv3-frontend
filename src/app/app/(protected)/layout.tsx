import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // 1) No autenticado => fuera
  if (!session?.user?.email) redirect("/?callbackUrl=/app");

  // 4) sesión caducada/refresh fallido => fuera
  const tokenError = (session as any).tokenError;
  const accessToken = (session as any).accessToken as string | undefined;
  if (tokenError || !accessToken) redirect("/?callbackUrl=/app");

  // 1) y 2) comprobar perfil
  const apigateway = process.env.API_GATEWAY_URL;
  if (!apigateway) redirect("/?callbackUrl=/app"); // si no hay backend, mejor tratar como inválido

  const res = await fetch(
    `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(session.user.email)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );

  // si falla la comprobación, decide política: yo recomiendo “fuera” para evitar loops raros
  if (!res.ok) redirect("/?callbackUrl=/app");

  const data = (await res.json()) as { result: boolean };

  // 1) autenticado SIN perfil => al onboarding
  if (data.result === false) redirect("/app/onboarding");

  // ✅ autenticado CON perfil => OK
  return (
    <>
      <Navbar subtitle="Dashboard" />
      {children}
    </>
  );
}
