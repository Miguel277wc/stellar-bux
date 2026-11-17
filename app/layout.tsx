import type { Metadata } from "next";
import "../public/store.css";
import "./type.css";

const siteUrl = "https://stellarbux.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Stellar Bux",
  description: "Robux, gift cards e contas premium — entrega na sua conta do Roblox.",
  alternates: { canonical: "/" },
  openGraph: {
    url: siteUrl,
    siteName: "Stellar Bux",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
