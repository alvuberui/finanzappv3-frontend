// src/app/login/page.tsx
"use client";
import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function Login({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  useEffect(() => {
    void signIn("keycloak", { callbackUrl: searchParams?.callbackUrl ?? "/" });
  }, []); // ejecuta una sola vez al montar

  return <></>;
}
