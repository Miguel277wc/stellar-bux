export const ROBUX_STEP = 600;
export const CENTS_PER_STEP = 1190;
export const EXPRESS_DELIVERY_CENTS = 1290;
export const MIN_PIX_CENTS = 1000;
export const STORE_PACKS = [600, 1200, 1800, 2400] as const;
export const PIX_DESCRIPTION = "Pedido Stellar Bux";

export type CheckoutItem = {
  sku: string;
  quantity: number;
};

export type QuoteLine = {
  sku: string;
  quantity: number;
  amountCents: number;
};

export type Quote = {
  amountCents: number;
  description: string;
  lines: QuoteLine[];
  express: boolean;
};

export function quoteRobuxSku(sku: string): number {
  const match = /^r(\d+)$/.exec(sku.trim());
  if (!match) {
    throw new Error(`SKU desconhecido: ${sku}`);
  }
  const robux = Number(match[1]);
  if (!Number.isInteger(robux) || robux <= 0 || robux % ROBUX_STEP !== 0) {
    throw new Error(`SKU desconhecido: ${sku}`);
  }
  return (robux / ROBUX_STEP) * CENTS_PER_STEP;
}

export function quoteCheckout(items: CheckoutItem[], express = false): Quote {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("O pedido precisa de pelo menos um item.");
  }

  const lines = items.map((item) => {
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Quantidade inválida para ${item.sku}.`);
    }
    const unit = quoteRobuxSku(item.sku);
    return { sku: item.sku.trim(), quantity, amountCents: unit * quantity };
  });

  const products = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const rawCents = products + (express ? EXPRESS_DELIVERY_CENTS : 0);
  const amountCents = rawCents > 0 && rawCents < MIN_PIX_CENTS ? MIN_PIX_CENTS : rawCents;
  return {
    amountCents,
    description: PIX_DESCRIPTION,
    lines,
    express,
  };
}
