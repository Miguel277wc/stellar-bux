"use client";

import { useState } from "react";
import { quoteCheckout } from "@/lib/catalog";

const PACKS = [1000, 2500, 5000, 10000];

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function HomePage() {
  const [express, setExpress] = useState(false);

  return (
    <main className="store">
      <header className="store-top">
        <div>
          <p className="eyebrow">Stellar Bux</p>
          <h1>Robux</h1>
        </div>
        <p className="store-note">R$ 7,90 a cada 1.000 Robux</p>
      </header>
      <label className="express">
        <input type="checkbox" checked={express} onChange={(event) => setExpress(event.target.checked)} />
        Entrega expressa por R$ 12,90
      </label>
      <section className="pack-grid">
        {PACKS.map((robux) => {
          const quote = quoteCheckout([{ sku: `r${robux}`, quantity: 1 }], express);
          const href = `/checkout?robux=${robux}&express=${express ? "1" : "0"}`;
          return (
            <article className="pack-card" key={robux}>
              <h2>{robux.toLocaleString("pt-BR")} Robux</h2>
              <p className="price">{reais.format(quote.amountCents / 100)}</p>
              <a className="buy" href={href}>
                Pagar com PIX
              </a>
            </article>
          );
        })}
      </section>
    </main>
  );
}
