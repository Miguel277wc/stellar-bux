"use client";

import { useEffect, useState, type FormEvent } from "react";
import { quoteCheckout } from "@/lib/catalog";

type PixResponse = {
  id?: string;
  copia_cola?: string;
  qr_code?: string;
  error?: string;
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PACKS = new Set([1000, 2500, 5000, 10000]);

export function CheckoutForm({ robux, express }: { robux: number; express: boolean }) {
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

  const known = PACKS.has(robux);
  const amountCents = known ? quoteCheckout([{ sku: `r${robux}`, quantity: 1 }], express).amountCents : 0;

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
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ sku: `r${robux}`, quantity: 1 }],
          express,
          customer: { name, email, phone, document, roblox_username: username },
        }),
      });
      const body = (await response.json()) as PixResponse;
      if (!response.ok || !body.qr_code) {
        setError(body.error || "O PIX não pode ser gerado.");
        return;
      }
      setPix(body);
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

  if (!known) {
    return (
      <main className="shop">
        <p className="alert">Escolha um pacote na loja.</p>
        <a href="/">Voltar</a>
      </main>
    );
  }

  return (
    <main className="shop">
      <header className="shop-top">
        <a className="brand" href="/">
          Stellar Bux
        </a>
        <div className="secure">PIX FlevoPay</div>
      </header>
      <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        {pix?.qr_code ? (
          <div className="pix-panel">
            <h1>Pague o PIX</h1>
            <p className="hint">{reais.format(amountCents / 100)}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="QR Code do PIX" src={pix.qr_code} width={220} height={220} />
            {pix.copia_cola ? (
              <>
                <textarea className="pix-code" readOnly value={pix.copia_cola} aria-label="Código Pix copia e cola" />
                <button className="copy" type="button" onClick={() => void copyCode()}>
                  {copied ? "Código Pix copiado!" : "Copiar código Pix"}
                </button>
              </>
            ) : null}
            <p className={status === "approved" ? "done" : "wait"}>
              {status === "approved" ? "Pagamento concluído!" : "Aguardando confirmação do pagamento..."}
            </p>
          </div>
        ) : (
          <form className="form" onSubmit={pay}>
            <h1>
              {robux.toLocaleString("pt-BR")} Robux
            </h1>
            <p className="hint">
              {reais.format(amountCents / 100)}
              {express ? " com entrega expressa" : ""}
            </p>
            <label>
              Nome completo
              <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Nome e sobrenome" />
            </label>
            <label>
              E-mail
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seu@email.com" />
            </label>
            <label>
              Celular
              <input value={phone} onChange={(event) => setPhone(event.target.value)} required placeholder="11988887777" />
            </label>
            <label>
              CPF
              <input value={document} onChange={(event) => setDocument(event.target.value)} required placeholder="000.000.000-00" />
            </label>
            <label>
              Usuário do Roblox
              <input value={username} onChange={(event) => setUsername(event.target.value)} required placeholder="seu_usuario" />
            </label>
            {error ? <p className="alert" role="alert">{error}</p> : null}
            <button className="pay" type="submit" disabled={loading}>
              {loading ? "Gerando PIX..." : "Gerar PIX"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
