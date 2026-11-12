import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galaxy Bux",
  description: "Pedido de Robux com PIX",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
