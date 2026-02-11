import Providers from "./Providers";
import "./globals.css";
import "@/styles/brand.css";
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "FinanzApp",
  description: "Finanzas personales, fácil y moderno",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Si no hay sesión, vuelve al home (con callback)
  if (!session?.user?.email) {
    redirect("/?callbackUrl=/app");
  }

  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
