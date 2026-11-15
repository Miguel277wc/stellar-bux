"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MIN_PIX_CENTS, quoteCheckout } from "@/lib/catalog";
import { saveOrder } from "@/lib/order-client";
import type { StoreOrder } from "@/lib/orders";
import { useCart } from "@/lib/use-cart";

type CheckoutResponse = {
  checkout_url?: string;
  order?: StoreOrder;
  error?: string;
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function CheckoutForm() {
  const router = useRouter();
  const { cart, update } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const quote = cart.items.length
    ? (() => {
        try {
          return quoteCheckout(cart.items, cart.express);
        } catch {
          return null;
        }
      })()
    : null;

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!quote) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          express: cart.express,
          customer: { name, email, phone, document, roblox_username: username },
        }),
      });
      const body = (await response.json()) as CheckoutResponse;
      if (!response.ok || !body.checkout_url || !body.order) {
        setError(body.error || "O PIX não pode ser gerado.");
        return;
      }
      saveOrder(body.order);
      update({ items: [], express: false });
      router.push(body.checkout_url);
    } catch {
      setError("O PIX não pode ser gerado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <Link className="text-sm font-semibold text-muted-foreground" href="/">
        Voltar para a loja
      </Link>
      <section className="glass mt-4 rounded-[18px] p-5">
        <form className="grid gap-3" onSubmit={pay}>
          <h1 className="neon-title text-2xl">Pagamento</h1>
          {!quote ? <p>Escolha um produto na loja.</p> : null}
          {quote
            ? quote.lines.map((line) => (
                <p key={line.sku} className="flex justify-between gap-3">
                  <span>{line.quantity}× {line.name}</span>
                  <span>{reais.format(line.amountCents / 100)}</span>
                </p>
              ))
            : null}
          {quote?.express ? <p>Entrega expressa</p> : null}
          {quote ? <p className="text-xl font-extrabold text-[#e9d5ff]">{reais.format(quote.amountCents / 100)}</p> : null}
          {quote && quote.amountCents < MIN_PIX_CENTS ? <p>O PIX precisa de pelo menos R$ 10,00.</p> : null}
          <label>
            Nome completo
            <input className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/6 px-3" value={name} onChange={(event) => setName(event.target.value)} required placeholder="Nome e sobrenome" />
          </label>
          <label>
            E-mail
            <input className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/6 px-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seu@email.com" />
          </label>
          <label>
            Celular
            <input className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/6 px-3" value={phone} onChange={(event) => setPhone(event.target.value)} required placeholder="11988887777" />
          </label>
          <label>
            CPF
            <input className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/6 px-3" value={document} onChange={(event) => setDocument(event.target.value)} required placeholder="000.000.000-00" />
          </label>
          <label>
            Usuário do Roblox
            <input className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/6 px-3" value={username} onChange={(event) => setUsername(event.target.value)} required placeholder="seu_usuario" />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button className="btn-brand h-11 rounded-xl font-bold" type="submit" disabled={loading || !quote || quote.amountCents < MIN_PIX_CENTS}>
            {loading ? "Gerando PIX..." : "Gerar PIX"}
          </button>
        </form>
      </section>
    </main>
  );
}