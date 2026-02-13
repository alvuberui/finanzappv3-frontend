// src/app/page.tsx
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ClientHome from "./ClientHome";

export default async function Page() {
  const session = await auth();

  // No autenticado => landing pública
  if (!session?.user?.email) return <ClientHome />;

  // sesión inválida => landing pública
  const tokenError = (session as any).tokenError;
  const accessToken = (session as any).accessToken as string | undefined;
  if (tokenError || !accessToken) return <ClientHome />;

  const apigateway = process.env.API_GATEWAY_URL;
  if (!apigateway) return <ClientHome />;

  const res = await fetch(
    `${apigateway}/user/users/isOnboarded?email=${encodeURIComponent(session.user.email)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );

  if (!res.ok) return <ClientHome />;

  const data = (await res.json()) as { result: boolean };

  if (data.result === false) redirect("/app/onboarding");
  redirect("/app");
}
