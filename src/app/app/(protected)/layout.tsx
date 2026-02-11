// src/app/app/layout.tsx
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Si no hay sesión -> redirigir al home para que inicie login
  if (!session?.user?.email) {
    // callbackUrl a /app para que al loguear vuelva a /app
    redirect("/?callbackUrl=/app");
  }

  const apigateway = process.env.API_GATEWAY_URL;

  // Si no hay apigateway configurado, devolvemos children para no bloquear
  if (!apigateway) {
    return (
      <>
        <Navbar subtitle="Dashboard" />
        {children}
      </>
    );
  }

  const accessToken = (session as any).accessToken as string | undefined;

  try {
    const res = await fetch(
      `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(session.user.email)}`,
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = (await res.json()) as { result: boolean };
      if (data.result === false) {
        redirect("/app/onboarding");
      }
    } else {
      // En caso de 401/403 o fallo, no bloqueamos la app — se puede mejorar según tu API
    }
  } catch (err) {
    // Si falla la comprobación, no rompas la app en producción. Considera loggear.
  }

  return (
    <>
      <Navbar subtitle="Dashboard" />
      {children}
    </>
  );
}
