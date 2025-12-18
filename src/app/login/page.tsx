// app/login/page.tsx
"use client"
import { useEffect } from "react"
import { signIn } from "next-auth/react"

export default function Login({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  useEffect(() => {
    // dispara una sola vez; si quieres reaccionar a cambios de query, añade searchParams al array
    void signIn("keycloak", { callbackUrl: searchParams?.callbackUrl ?? "/" })
  }, []) // <- una sola ejecución al cargar la página

  return <></>
}
