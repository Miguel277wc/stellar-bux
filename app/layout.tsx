import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Bux",
  description: "Loja de Robux. O pagamento abre no checkout da Axxon Pay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
