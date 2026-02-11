// src/app/layout.tsx
import Providers from "./Providers";
import "./globals.css";
import "@/styles/brand.css";

export const metadata = {
  title: "FinanzApp",
  description: "Finanzas personales, fácil y moderno",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTA: NO llamar a auth() ni redirigir aquí (evita bucles).
  // La protección de /app/** la hace middleware + app/(app)/layout (ProtectedLayout).
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
