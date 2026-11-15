"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchOrder, loadOrder, saveOrder } from "@/lib/order-client";
import type { StoreOrder } from "@/lib/orders";

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PedidoView({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const sync = useCallback(async () => {
    if (!id) return null;
    const remote = await fetchOrder(id);
    if (remote) {
      saveOrder(remote);
      setOrder(remote);
    }
    return remote;
  }, [id]);

  useEffect(() => {
    setReady(true);
    if (!id) return;
    setOrder(loadOrder(id));
    void (async () => {
      await sync();
      setLoading(false);
    })();
  }, [id, sync]);

  useEffect(() => {
    if (!ready || !id || !order || done) return;
    if (order.phase === "taxa") {
      router.replace(`/upsell?id=${encodeURIComponent(order.id)}`);
      return;
    }
    if (order.phase === "concluido") return;
    if (order.phase !== "principal" || order.status !== "pendente") return;

    const timer = window.setInterval(() => void sync(), 4000);
    void sync();
    return () => window.clearInterval(timer);
  }, [ready, id, order, done, router, sync]);

  async function verify(manual = false) {
    setChecking(true);
    setError("");
    try {
      const fresh = await sync();
      if (!fresh) {
        setError("Ainda não foi possível consultar o PIX.");
        return;
      }
      if (fresh.phase === "taxa") {
        router.replace(`/upsell?id=${encodeURIComponent(fresh.id)}`);
        return;
      }
      if (manual && fresh.status === "pago") {
        setError("");
        return;
      }
      if (manual) setError("Ainda não identificamos o pagamento. Aguarde alguns segundos e tente outra vez.");
    } catch {
      setError("Ainda não foi possível consultar o PIX.");
    } finally {
      setChecking(false);
    }
  }

  async function copyCode() {
    if (!order?.pix?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(order.pix.copyPaste);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!id) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-muted-foreground">Pedido sem pagamento.</p>
        <Link className="btn-brand mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5" href="/checkout">Voltar ao checkout</Link>
      </main>
    );
  }

  if (loading && !order) {
    return <p className="px-5 py-20 text-center text-muted-foreground">Carregando o pedido...</p>;
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Link className="btn-brand mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5" href="/">Voltar à loja</Link>
      </main>
    );
  }

  if (order.phase === "concluido" || done) {
    return (
      <main className="mx-auto max-w-xl px-5 py-12">
        <div className="glass rounded-[22px] p-6 text-center sm:p-8">
          <p className="text-sm font-bold tracking-[0.18em] text-[#c084fc] uppercase">Taxa confirmada</p>
          <h1 className="neon-title neon-title-lg mt-2 text-2xl sm:text-3xl">Pagamento concluído — pedido liberado</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Sua compra será entregue na conta Roblox <strong className="text-foreground">{order.customer.roblox_username}</strong>.
            {" "}
            {order.fastDelivery ? "A entrega expressa começa em até 1 hora." : "O prazo é de 3 a 10 dias após a confirmação dos pagamentos."}
          </p>
          <code className="mt-4 inline-block rounded-lg bg-white/8 px-2 py-1 font-mono text-sm">{order.id}</code>
          <Link className="btn-brand mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5" href="/">Voltar à loja</Link>
        </div>
      </main>
    );
  }

  if (order.phase !== "principal") {
    return <p className="px-5 py-20 text-center text-muted-foreground">Redirecionando...</p>;
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <Link className="text-sm font-semibold text-muted-foreground" href="/">Voltar à loja</Link>
      <section className="glass mt-4 rounded-[18px] p-5">
        <h1 className="neon-title text-2xl">Pague o PIX dos produtos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pedido <code>{order.id}</code></p>
        <p className="mt-4 text-xl font-extrabold text-[#e9d5ff]">{reais.format(order.merchandiseTotal / 100)}</p>
        {order.pix?.qrCodeImage ? (
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3">
            <img alt="QR Code PIX" src={order.pix.qrCodeImage} width={220} height={220} />
          </div>
        ) : null}
        {order.pix?.copyPaste ? (
          <>
            <textarea className="mt-4 h-24 w-full rounded-xl border border-white/15 bg-transparent p-3 text-xs" readOnly value={order.pix.copyPaste} aria-label="Código Pix copia e cola" />
            <button className="btn-glass mt-2 w-full" type="button" onClick={() => void copyCode()}>
              {copied ? "Código Pix copiado!" : "Copiar código Pix"}
            </button>
          </>
        ) : null}
        <p className="mt-4 font-semibold">
          {order.status === "pago" ? "Pagamento confirmado!" : "Aguardando confirmação do pagamento..."}
        </p>
        <button className="btn-brand mt-4 h-11 w-full rounded-xl font-bold" type="button" disabled={checking} onClick={() => void verify(true)}>
          {checking ? "Verificando pagamento..." : "Já paguei — verificar PIX"}
        </button>
        {error ? <p className="mt-3 text-sm text-[#ff8d8d]">{error}</p> : null}
      </section>
    </main>
  );
}