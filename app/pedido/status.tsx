"use client";

import { useEffect, useState } from "react";

type StatusResponse = {
  status?: string;
  error?: string;
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
      setStatus(body.status || "pending");
    };

    const timer = window.setInterval(() => void look(), 5000);
    void look();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [id]);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <h1>Pedido</h1>
      <p>{id}</p>
      <p>{label[status] || status}</p>
      {error ? <p role="alert">{error}</p> : null}
      <p>
        <a href="/checkout">Voltar ao checkout</a>
      </p>
    </main>
  );
}
