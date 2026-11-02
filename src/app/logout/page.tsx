"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { LoadingScreen } from "../components/LoadingUI";

export default function LogoutPage() {
  useEffect(() => {
    async function run() {
      await signOut({ redirect: false });

      const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
      const postLogoutRedirectUri = `${window.location.origin}/`;

      if (!issuer) {
        window.location.replace(postLogoutRedirectUri);
        return;
      }

      const url = new URL(`${issuer}/protocol/openid-connect/logout`);
      url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
      window.location.replace(url.toString());
    }

    void run();
  }, []);

  return <LoadingScreen label="Cerrando tu sesión" />;
}
