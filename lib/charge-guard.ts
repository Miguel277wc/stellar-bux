import { MAX_QTY, MIN_PIX_CENTS, productBySku, quoteCheckout } from "./catalog";

export const MAX_CHECKOUT_CENTS = 2_000_000;
export const MAX_CHARGES_PER_HOUR = 40;

const HOUR_MS = 60 * 60 * 1000;

export class CheckoutRejected extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CheckoutRejected";
    this.status = status;
  }
}

export function assertCheckoutOrder(items: Array<{ sku?: string; quantity?: number }> | undefined) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    throw new CheckoutRejected("Escolha um produto da loja.");
  }
  for (const item of items) {
    const product = productBySku(String(item.sku ?? ""));
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY || (product.unique && quantity !== 1)) {
      throw new CheckoutRejected("Escolha um produto da loja.");
    }
  }
}

export function assertCheckoutAmount(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < MIN_PIX_CENTS || amountCents > MAX_CHECKOUT_CENTS) {
    throw new CheckoutRejected("O PIX da loja começa em R$ 10,00.");
  }
}

export function createChargeWindow(max = MAX_CHARGES_PER_HOUR, windowMs = HOUR_MS) {
  const hits = new Map<string, number[]>();
  return function allow(callerId: string, now = Date.now()) {
    const recent = (hits.get(callerId) ?? []).filter((at) => now - at < windowMs);
    if (recent.length >= max) {
      throw new CheckoutRejected("Muitas cobranças seguidas. Espere uma hora e tente de novo.", 429);
    }
    recent.push(now);
    hits.set(callerId, recent);
  };
}

export const allowCharge = createChargeWindow();

export function quotedAmount(items: Array<{ sku?: string; quantity?: number }>, express: boolean) {
  return quoteCheckout(
    items.map((item) => ({ sku: String(item.sku ?? ""), quantity: Number(item.quantity) })),
    express,
  );
}
