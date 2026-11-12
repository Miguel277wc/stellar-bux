"use client";

import { useEffect, useState, type FormEvent } from "react";

type PixResponse = {
  id: string;
  amount_cents: number;
  copia_cola: string;
  qr_code: string;
  receiver_name?: string | null;
  error?: string;
};

type StatusResponse = {
  status?: string;
  error?: string;
};

const PACKS = [1000, 2500, 5000, 10000];
const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function centsFor(robux: number, express: boolean) {
  return Math.round((robux / 1000) * 790) + (express ? 1290 : 0);
}

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
  const [copied, setCopied] = useState(false);
  const [payStatus, setPayStatus] = useState("pending");
  const [pix, setPix] = useState<PixResponse | null>(null);

  const amountCents = centsFor(robux, express);
  const productCents = centsFor(robux, false);

  useEffect(() => {
    if (!pix?.id) return;
    let stopped = false;
    const look = async () => {
      const response = await fetch(`/api/pagamento/status?id=${encodeURIComponent(pix.id)}`);
      const body = (await response.json()) as StatusResponse;
      if (stopped || !response.ok) return;
      setPayStatus(body.status || "pending");
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
    setCopied(false);
    setPayStatus("pending");
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

  async function copyCode() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copia_cola);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="shop">
      <header className="shop-top">
        <div className="brand">Stellar Bux</div>
        <div className="secure">Pagamento seguro</div>
      </header>
      <div className="checkout-grid">
        <section className="card">
          <h2>Resumo do pedido</h2>
          <div className="packs">
            {PACKS.map((pack) => (
              <label className="pack" key={pack}>
                <span>
                  <input
                    type="radio"
                    name="pack"
                    checked={robux === pack}
                    onChange={() => setRobux(pack)}
                  />{" "}
                  {pack.toLocaleString("pt-BR")} Robux
                </span>
                <strong>{reais.format(centsFor(pack, false) / 100)}</strong>
              </label>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={express} onChange={(event) => setExpress(event.target.checked)} />
            Entrega expressa
          </label>
          <div className="lines">
            <div className="line">
              <span>{robux.toLocaleString("pt-BR")} Robux</span>
              <span>{reais.format(productCents / 100)}</span>
            </div>
            {express ? (
              <div className="line">
                <span>Entrega expressa</span>
                <span>{reais.format(12.9)}</span>
              </div>
            ) : null}
            <div className="total">
              <span>Total</span>
              <span>{reais.format(amountCents / 100)}</span>
            </div>
          </div>
        </section>

        <section className="card">
          {pix ? (
            <div className="pix-panel">
              <h2>Escaneie o QR Code para pagar</h2>
              <p className="hint">Abra o app do seu banco e use a câmera para escanear o código.</p>
              {/* QR gerado na hora, em data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="QR Code do PIX" src={pix.qr_code} width={220} height={220} />
              <p className="hint">Código Pix copia e cola</p>
              <textarea className="pix-code" readOnly value={pix.copia_cola} aria-label="Código Pix copia e cola" />
              <button className="copy" type="button" onClick={() => void copyCode()}>
                {copied ? "Código Pix copiado!" : "Copiar código Pix"}
              </button>
              <p className="hint">
                Depois de copiar, cole no app do banco na opção Pix copia e cola.
                {pix.receiver_name ? ` Recebedor: ${pix.receiver_name}.` : ""}
              </p>
              {payStatus === "approved" ? (
                <p className="done">Pagamento concluído!</p>
              ) : (
                <p className="wait">Aguardando confirmação do pagamento...</p>
              )}
              <a className="linkish" href={`/pedido?id=${encodeURIComponent(pix.id)}`}>
                Acompanhar pedido
              </a>
            </div>
          ) : (
            <form className="form" onSubmit={pay}>
              <h2>Finalizar pagamento</h2>
              <label>
                Nome completo
                <input
                  autoComplete="name"
                  placeholder="Nome e sobrenome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Celular
                <input
                  autoComplete="tel"
                  placeholder="11988887777"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>
              <label>
                CPF
                <input
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                  required
                />
              </label>
              <label>
                Usuário do Roblox
                <input
                  placeholder="seu_usuario"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </label>
              <div>
                <p className="hint" style={{ marginBottom: 8 }}>
                  Opções de pagamento
                </p>
                <div className="method">
                  <span>Pagar com PIX</span>
                  <span>{reais.format(amountCents / 100)}</span>
                </div>
              </div>
              {error ? (
                <p className="alert" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="pay" type="submit" disabled={loading || amountCents < 600}>
                {loading ? "Gerando PIX..." : "Pagar com PIX"}
              </button>
            </form>
          )}
        </section>
      </div>
      <p className="foot">Pagamento seguro e criptografado</p>
    </div>
  );
}
