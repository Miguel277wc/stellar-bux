export const CHECKOUT_SKUS = new Set(["r1000", "r2500", "r5000", "r10000"]);
export const MAX_CHECKOUT_CENTS = 9190;
export const MAX_CHARGES_PER_HOUR = 5;

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
  if (!Array.isArray(items) || items.length !== 1) {
    throw new CheckoutRejected("Escolha um pacote da loja.");
  }
  const [item] = items;
  if (!item || !CHECKOUT_SKUS.has(String(item.sku ?? "")) || item.quantity !== 1) {
    throw new CheckoutRejected("Escolha um pacote da loja.");
  }
}

export function assertCheckoutAmount(amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < 600 || amountCents > MAX_CHECKOUT_CENTS) {
    throw new CheckoutRejected("O valor do pedido está fora do limite da loja.");
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
