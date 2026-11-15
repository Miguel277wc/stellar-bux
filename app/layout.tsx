import type { Metadata } from "next";
import "../public/store.css";
import "./type.css";

export const metadata: Metadata = {
  title: "Stellar Bux",
  description: "Robux, gift cards e contas premium — entrega na sua conta do Roblox.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
