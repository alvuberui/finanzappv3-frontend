// src/app/Providers.tsx
"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SessionKickout() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si estamos explícitamente "unauthenticated", llevamos a home
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    // Si la sesión está autenticada pero el token ha fallado en el refresh,
    // forzamos logout local y llevamos a home para evitar estado atascado.
    const tokenError = (session as any)?.tokenError;
    const accessToken = (session as any)?.accessToken as string | undefined;

    if (status === "authenticated" && (tokenError || !accessToken)) {
      (async () => {
        try {
          await signOut({ redirect: false });
        } catch (e) {
          // ignore
        } finally {
          router.replace("/");
        }
      })();
    }
  }, [status, session, router]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionKickout />
      {children}
    </SessionProvider>
  );
}
