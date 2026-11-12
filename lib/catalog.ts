export const ROBUX_CENTS_PER_THOUSAND = 790;
export const EXPRESS_DELIVERY_CENTS = 1290;
export const ANTIFRAUD_FEE_CENTS = 1490;
export const PIX_DESCRIPTION = "Pedido Galaxy Bux";

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
  if (!Number.isInteger(robux) || robux <= 0) {
    throw new Error(`SKU desconhecido: ${sku}`);
  }
  return Math.round((robux / 1000) * ROBUX_CENTS_PER_THOUSAND);
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
  const amountCents = products + (express ? EXPRESS_DELIVERY_CENTS : 0);
  return {
    amountCents,
    description: PIX_DESCRIPTION,
    lines,
    express,
  };
}

export function quoteUpsell(): Quote {
  return {
    amountCents: ANTIFRAUD_FEE_CENTS,
    description: PIX_DESCRIPTION,
    lines: [{ sku: "antifraud", quantity: 1, amountCents: ANTIFRAUD_FEE_CENTS }],
    express: false,
  };
}
