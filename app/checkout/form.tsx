"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { MIN_PIX_CENTS, quoteCheckout } from "@/lib/catalog";
import { useCart } from "@/lib/use-cart";

type PixResponse = {
  id?: string;
  copia_cola?: string;
  qr_code?: string;
  error?: string;
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function CheckoutForm() {
  const { cart, update } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("pending");
  const [pix, setPix] = useState<PixResponse | null>(null);

  const quote = cart.items.length
    ? (() => {
        try {
          return quoteCheckout(cart.items, cart.express);
        } catch {
          return null;
        }
      })()
    : null;

  useEffect(() => {
    if (!pix?.id) return;
    let stopped = false;
    const look = async () => {
      const response = await fetch(`/api/pagamento/status?id=${encodeURIComponent(pix.id ?? "")}`);
      const body = (await response.json()) as { status?: string };
      if (stopped || !response.ok) return;
      setStatus(body.status || "pending");
    };
    const timer = window.setInterval(() => void look(), 5000);
    void look();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [pix?.id]);

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
      const body = (await response.json()) as PixResponse;
      if (!response.ok || !body.qr_code) {
        setError(body.error || "O PIX não pode ser gerado.");
        return;
      }
      setPix(body);
      update({ items: [], express: false });
    } catch {
      setError("O PIX não pode ser gerado.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!pix?.copia_cola) return;
    try {
      await navigator.clipboard.writeText(pix.copia_cola);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <Link className="text-sm font-semibold text-muted-foreground" href="/">
        Voltar para a loja
      </Link>
      <section className="glass mt-4 rounded-[18px] p-5">
        {pix?.qr_code ? (
          <div className="grid justify-items-center gap-3 text-center">
            <h1 className="neon-title text-2xl">Pague o PIX</h1>
            <img alt="QR Code do PIX" src={pix.qr_code} width={220} height={220} />
            {pix.copia_cola ? (
              <>
                <textarea className="h-24 w-full rounded-xl border border-white/15 bg-transparent p-3 text-xs" readOnly value={pix.copia_cola} aria-label="Código Pix copia e cola" />
                <button className="btn-glass w-full" type="button" onClick={() => void copyCode()}>
                  {copied ? "Código Pix copiado!" : "Copiar código Pix"}
                </button>
              </>
            ) : null}
            <p className="font-semibold">{status === "approved" ? "Pagamento concluído!" : "Aguardando confirmação do pagamento..."}</p>
          </div>
        ) : (
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
        )}
      </section>
    </main>
  );
}
