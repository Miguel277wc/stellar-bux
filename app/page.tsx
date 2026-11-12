"use client";

import { useState } from "react";
import { quoteCheckout } from "@/lib/catalog";
import { STORE_PACKS, packCheckoutUrl } from "@/lib/store-packs";

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
        {STORE_PACKS.map((pack) => {
          const quote = quoteCheckout([{ sku: `r${pack.robux}`, quantity: 1 }], express);
          return (
            <article className="pack-card" key={pack.robux}>
              <h2>{pack.robux.toLocaleString("pt-BR")} Robux</h2>
              <p className="price">{reais.format(quote.amountCents / 100)}</p>
              <a className="buy" href={packCheckoutUrl(pack.robux, express)}>
                Ir para o checkout
              </a>
            </article>
          );
        })}
      </section>
    </main>
  );
}
