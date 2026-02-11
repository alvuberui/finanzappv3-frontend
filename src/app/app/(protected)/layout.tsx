import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/?callbackUrl=/app");
  }

  const apigateway = process.env.API_GATEWAY_URL;

  // Si no está configurado, no bloquees
  if (!apigateway) return <>{children}</>;

  // Aquí idealmente pasarías access token al API gateway si lo requiere.
  // Pero tu gateway lo estás protegiendo con Bearer. En tu NextAuth,
  // ahora mismo NO estás metiendo accessToken en el JWT/session.
  // Te lo arreglo en el paso 5.
  const accessToken = (session as any).accessToken as string | undefined;

  try {
    const res = await fetch(
      `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(
        session.user.email
      )}`,
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
    }
  } catch {
    // Si falla el check, no rompas la app
  }

  return <>
  <Navbar subtitle="Dashboard" />
  {children}
  </>;
}
