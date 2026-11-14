"use client";

import { useEffect, useState } from "react";

type StatusResponse = {
  status?: string;
  error?: string;
  qr_code?: string | null;
  copia_cola?: string | null;
  receiver_name?: string | null;
};

const label: Record<string, string> = {
  pending: "Aguardando o PIX",
  approved: "PIX pago",
  failed: "PIX recusado",
  refunded: "PIX estornado",
};

export function PedidoStatus({ id }: { id: string }) {
  const [status, setStatus] = useState(id ? "pending" : "");
  const [error, setError] = useState(id ? "" : "Pedido sem pagamento.");
  const [qrCode, setQrCode] = useState("");
  const [copiaCola, setCopiaCola] = useState("");
  const [receiver, setReceiver] = useState("");

  useEffect(() => {
    if (!id) return;
    let stopped = false;
    const look = async () => {
      const response = await fetch(`/api/pagamento/status?id=${encodeURIComponent(id)}`);
      const body = (await response.json()) as StatusResponse;
      if (stopped) return;
      if (!response.ok) {
        setError(body.error || "Não foi possível consultar o PIX.");
        return;
      }
      setError("");
      setStatus(body.status || "pending");
      setQrCode(body.qr_code || "");
      setCopiaCola(body.copia_cola || "");
      setReceiver(body.receiver_name || "");
    };

    const timer = window.setInterval(() => void look(), 5000);
    void look();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [id]);

  return (
    <div className="shop">
      <header className="shop-top">
        <div className="brand">Stellar Bux</div>
        <div className="secure">Pagamento seguro</div>
      </header>
      <section className="card pix-panel" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1>{qrCode ? "Escaneie o QR Code para pagar" : "Pedido"}</h1>
        <p className={status === "approved" ? "done" : "wait"}>{label[status] || status}</p>
        {receiver ? <p className="hint">Recebedor: {receiver}</p> : null}
        {qrCode ? <img src={qrCode} alt="QR Code PIX" width={220} height={220} /> : null}
        {copiaCola ? (
          <textarea className="pix-code" readOnly value={copiaCola} aria-label="Código Pix copia e cola" />
        ) : null}
        {error ? <p className="alert" role="alert">{error}</p> : null}
        <a className="linkish" href="/checkout">
          Voltar ao checkout
        </a>
      </section>
    </div>
  );
}
