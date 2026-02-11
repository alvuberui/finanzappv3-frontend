"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, useSearchParams  } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // en src/app/page.tsx (o /login) -> useEffect
useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/app";

      // evita redirigir a la misma ruta (previene bucles)
      if (callbackUrl !== window.location.pathname) {
        router.replace(callbackUrl);
      }
    }
  }, [status, router, searchParams]);


  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-gray-100 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-title-from)] to-[var(--brand-title-to)]">
          FinanzApp
        </h1>

        <p className="mt-4 max-w-2xl text-lg md:text-xl text-gray-300">
          La forma más sencilla y elegante de llevar tus finanzas personales.
          Controla tus gastos, visualiza tus ingresos y alcanza tus objetivos financieros.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {isLoading ? (
            <button className="px-6 py-3 rounded-full bg-gray-700 text-white/70 cursor-wait">
              Cargando…
            </button>
          ) : !isLoggedIn ? (
            <button
              onClick={() => signIn("keycloak")}
              className="px-6 py-3 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold text-lg shadow-lg [--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.30)] transition"
            >
              Iniciar sesión / Registrarse
            </button>
          ) : (
            <p className="text-lg text-gray-400">Entrando a tu panel…</p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-black/30 backdrop-blur-sm border-t border-white/10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          ¿Por qué usar FinanzApp?
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Feature
            title="📊 Control total"
            desc="Registra tus ingresos y gastos y visualiza estadísticas claras en tiempo real."
          />
          <Feature
            title="🎯 Objetivos financieros"
            desc="Define metas de ahorro/inversión y mide tu progreso con gráficas intuitivas."
          />
          <Feature
            title="🔒 Seguridad"
            desc="Autenticación con Keycloak, cifrado y privacidad de nivel empresarial."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-[var(--brand-cta-from)] via-[var(--brand-cta-via)] to-[var(--brand-cta-to)] text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Toma el control de tus finanzas hoy mismo
        </h2>
        <p className="mb-8 text-lg text-white/90 max-w-2xl mx-auto">
          FinanzApp es tu asistente financiero personal: simple, seguro y poderoso.
        </p>
        {status !== "authenticated" && (
          <button
            onClick={() => signIn("keycloak")}
            className="px-8 py-4 rounded-full bg-white text-[var(--brand-cta-from)] font-semibold text-lg shadow-md hover:bg-gray-100 transition"
          >
            Comienza gratis
          </button>
        )}
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-black/40 text-center border-t border-white/10">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} FinanzApp. Todos los derechos reservados.
        </p>
      </footer>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-md hover:shadow-lg hover:[--tw-shadow-color:rgb(var(--brand-primary-rgb)/0.20)] transition">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-300">{desc}</p>
    </div>
  );
}
