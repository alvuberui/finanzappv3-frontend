// src/app/page.tsx
import React, { Suspense } from "react";
import ClientHome from "./ClientHome";


export const metadata = {
  title: "FinanzApp",
  description: "Finanzas personales, fácil y moderno",
};

export default function Page() {
  return (
    // Suspense es necesario cuando montamos un componente cliente
    // que usa hooks de next/navigation (useSearchParams, useRouter).
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
      <ClientHome />
    </Suspense>
  );
}
