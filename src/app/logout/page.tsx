// src/app/logout/page.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function LogoutPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    async function run() {
      // 1) Cierra sesión local (NextAuth) SIN redirigir
      await signOut({ redirect: false });

      // 2) Cierra sesión SSO en Keycloak
      const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
      const origin = window.location.origin;
      const postLogoutRedirectUri = `${origin}/`;

      // Si por lo que sea no hay issuer, al menos vuelve a home
      if (!issuer) {
        window.location.href = postLogoutRedirectUri;
        return;
      }

      const idToken = (session as any)?.idToken as string | undefined;

      // Construir URL logout Keycloak
      const url = new URL(`${issuer}/protocol/openid-connect/logout`);
      url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

      // id_token_hint hace que Keycloak cierre bien la sesión actual
      if (idToken) url.searchParams.set("id_token_hint", idToken);

      window.location.href = url.toString();
    }

    // Esperamos a que session cargue para tener idToken si existe.
    // Si ya está cargado o incluso si no hay sesión, ejecutamos igualmente (cierra SSO si lo hay).
    if (status !== "loading") void run();
  }, [status, session]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Saliendo…
    </div>
  );
}
