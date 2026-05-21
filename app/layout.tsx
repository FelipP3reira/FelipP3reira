import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Sistema de Multas Veiculares",
  description: "Cadastro e gestão de veículos e multas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container">
          <NavBar />
          {children}
        </div>
      </body>
    </html>
  );
}
