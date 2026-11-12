"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

type PixResponse = {
  id: string;
  amount_cents: number;
  copia_cola: string;
  qr_code: string;
  error?: string;
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CheckoutPage() {
  const [robux, setRobux] = useState(1000);
  const [express, setExpress] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<PixResponse | null>(null);

  const amountCents = Math.round((robux / 1000) * 790) + (express ? 1290 : 0);

  async function pay(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPix(null);
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ sku: `r${robux}`, quantity: 1 }],
          express,
          customer: {
            name,
            email,
            phone,
            document,
            roblox_username: username,
          },
        }),
      });
      const body = (await response.json()) as PixResponse;
      if (!response.ok || !body.copia_cola) {
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

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Galaxy Bux</h1>
      <p style={{ color: "#b7adc9" }}>R$ 7,90 a cada 1.000 Robux. A Sicredi gera o PIX pela Axxon Pay.</p>
      <form onSubmit={pay} style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <label>
          Robux
          <input
            type="number"
            min={760}
            step={1}
            value={robux}
            onChange={(event) => setRobux(Number(event.target.value))}
            required
            style={field}
          />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={express} onChange={(event) => setExpress(event.target.checked)} />
          Entrega expressa (R$ 12,90)
        </label>
        <input placeholder="Nome e sobrenome" value={name} onChange={(event) => setName(event.target.value)} required style={field} />
        <input placeholder="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={field} />
        <input placeholder="Celular com DDD" value={phone} onChange={(event) => setPhone(event.target.value)} required style={field} />
        <input placeholder="CPF" value={document} onChange={(event) => setDocument(event.target.value)} required style={field} />
        <input placeholder="Usuário do Roblox" value={username} onChange={(event) => setUsername(event.target.value)} required style={field} />
        <button type="submit" disabled={loading || amountCents < 600} style={button}>
          {loading ? "Gerando PIX..." : `Gerar PIX de ${reais.format(amountCents / 100)}`}
        </button>
      </form>
      {error ? (
        <p role="alert" style={{ color: "#ffb4b4" }}>
          {error}
        </p>
      ) : null}
      {pix ? (
        <section style={{ marginTop: 24 }}>
          {/* QR gerado na hora, em data URL. O otimizador de imagem não serve esse caso. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="QR Code do PIX" src={pix.qr_code} width={280} height={280} />
          <p>Copia e cola</p>
          <textarea readOnly value={pix.copia_cola} rows={4} style={{ ...field, width: "100%" }} />
          <p>
            <a href={`/pedido?id=${encodeURIComponent(pix.id)}`}>Acompanhar pedido</a>
          </p>
        </section>
      ) : null}
    </main>
  );
}

const field: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 4,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3a3350",
  background: "#120f1c",
  color: "#f4f1ff",
};

const button: CSSProperties = {
  padding: "12px 16px",
  border: 0,
  borderRadius: 8,
  background: "#7c4dff",
  color: "white",
  fontWeight: 700,
};
