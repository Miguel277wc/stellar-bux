import { ANTIFRAUD_FEE_CENTS, ANTIFRAUD_FEE_REAIS, UPSELL_WINDOW_MS, productBySku, type Quote } from "./catalog";
import type { PixCustomer } from "./flevopay";
import { getPixCharge, paymentView, readFlevoCredentials } from "./flevopay";

export type OrderPhase = "principal" | "taxa" | "concluido";
export type OrderStatus = "pendente" | "pago" | "falhou";

export type OrderLine = {
  sku: string;
  name: string;
  quantity: number;
  amountCents: number;
  kind: "robux" | "item" | "account" | "gift";
};

export type OrderPix = {
  id: string;
  copyPaste: string;
  qrCodeImage: string;
  amountCents: number;
};

export type StoreOrder = {
  id: string;
  phase: OrderPhase;
  status: OrderStatus;
  createdAt: string;
  customer: PixCustomer & { roblox_username: string };
  lines: OrderLine[];
  merchandiseTotal: number;
  taxAmount: number;
  total: number;
  fastDelivery: boolean;
  principalPixId: string;
  taxPixId?: string;
  pix?: OrderPix;
  principalPaid: boolean;
  taxPaid: boolean;
  upsellExpiresAt?: string;
};

type StoredOrder = StoreOrder & { payer: PixCustomer };

const globalStore = globalThis as typeof globalThis & { stellarOrders?: Map<string, StoredOrder> };
const orders = globalStore.stellarOrders ?? new Map<string, StoredOrder>();
globalStore.stellarOrders = orders;

export function normalizeOrder(order: StoreOrder): StoreOrder {
  return {
    ...order,
    phase: order.phase ?? "principal",
    merchandiseTotal: order.merchandiseTotal ?? order.total,
    taxAmount: order.taxAmount ?? ANTIFRAUD_FEE_CENTS,
    total: order.total ?? order.merchandiseTotal,
    fastDelivery: Boolean(order.fastDelivery),
    principalPaid: Boolean(order.principalPaid),
    taxPaid: Boolean(order.taxPaid),
  };
}

export function putOrder(order: StoredOrder) {
  orders.set(order.id, { ...order, customer: { ...order.customer }, payer: { ...order.payer } });
}

export function getStoredOrder(id: string): StoredOrder | null {
  const order = orders.get(id);
  return order ? { ...order, customer: { ...order.customer }, payer: { ...order.payer } } : null;
}

export function publicOrder(order: StoreOrder): StoreOrder {
  const copy = normalizeOrder(order);
  return {
    ...copy,
    customer: {
      name: copy.customer.name,
      email: copy.customer.email,
      phone: copy.customer.phone,
      document: copy.customer.document,
      roblox_username: copy.customer.roblox_username,
    },
    lines: copy.lines.map((line) => ({ ...line })),
    pix: copy.pix ? { ...copy.pix } : undefined,
  };
}

export function createOrder(input: {
  id: string;
  quote: Quote;
  customer: PixCustomer & { roblox_username: string };
  fastDelivery: boolean;
  pix: OrderPix;
  principalPixId: string;
}): StoredOrder {
  const merchandiseTotal = input.quote.amountCents;
  const lines = input.quote.lines.map((line) => {
    const product = productBySku(line.sku);
    return {
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      amountCents: line.amountCents,
      kind: product?.kind ?? "item",
    };
  });
  const order: StoredOrder = {
    id: input.id,
    phase: "principal",
    status: "pendente",
    createdAt: new Date().toISOString(),
    customer: input.customer,
    payer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      document: input.customer.document,
    },
    lines,
    merchandiseTotal,
    taxAmount: ANTIFRAUD_FEE_CENTS,
    total: merchandiseTotal,
    fastDelivery: input.fastDelivery,
    principalPixId: input.principalPixId,
    pix: input.pix,
    principalPaid: false,
    taxPaid: false,
  };
  putOrder(order);
  return order;
}

function orderStatus(view: ReturnType<typeof paymentView>): OrderStatus {
  if (view === "approved") return "pago";
  if (view === "failed") return "falhou";
  return "pendente";
}

export async function refreshOrderPayment(orderId: string): Promise<StoreOrder | null> {
  const stored = getStoredOrder(orderId);
  if (!stored) return null;

  const credentials = readFlevoCredentials();
  if (!credentials) return publicOrder(stored);

  const activePixId =
    stored.phase === "principal"
      ? stored.principalPixId
      : stored.phase === "taxa" && stored.taxPixId
        ? stored.taxPixId
        : stored.phase === "concluido" && stored.taxPixId
          ? stored.taxPixId
          : "";

  if (!activePixId) return publicOrder(stored);

  try {
    const payment = await getPixCharge(credentials, activePixId);
    const next = { ...stored };
    next.status = orderStatus(payment.view);

    if (payment.view === "approved") {
      if (next.phase === "principal") {
        next.principalPaid = true;
        next.phase = "taxa";
        next.status = "pendente";
        next.upsellExpiresAt = new Date(Date.now() + UPSELL_WINDOW_MS).toISOString();
        next.pix = undefined;
      } else if (next.phase === "taxa") {
        next.taxPaid = true;
        next.phase = "concluido";
        next.status = "pago";
      }
    }

    putOrder(next);
    return publicOrder(next);
  } catch {
    return publicOrder(stored);
  }
}

export function attachTaxPix(orderId: string, pix: OrderPix, taxPixId: string): StoreOrder | null {
  const stored = getStoredOrder(orderId);
  if (!stored || stored.phase !== "taxa" || !stored.principalPaid || stored.taxPaid) return null;
  const next = {
    ...stored,
    taxPixId,
    pix,
    status: "pendente" as const,
    upsellExpiresAt: stored.upsellExpiresAt ?? new Date(Date.now() + UPSELL_WINDOW_MS).toISOString(),
  };
  putOrder(next);
  return publicOrder(next);
}

export function payerForOrder(orderId: string): PixCustomer | null {
  const stored = getStoredOrder(orderId);
  return stored?.payer ?? null;
}

export function orderCompletionCopy(order: StoreOrder) {
  const username = order.customer.roblox_username;
  const hasRobux = order.lines.some((line) => line.kind === "robux" || line.kind === "gift");
  return {
    title: "Pagamento concluído — pedido liberado",
    hasRobux,
    username,
    timing: order.fastDelivery
      ? "A entrega expressa começa em até 1 hora."
      : "O prazo é de 3 a 10 dias após a confirmação dos pagamentos.",
    flevoNote: "Os dois PIX (produtos e taxa de recebimento) caíram na mesma conta FlevoPay da loja.",
  };
}

export function taxDescription(order: StoreOrder) {
  return `Taxa de recebimento ${order.id}`;
}

export const ANTIFRAUD_LABEL = ANTIFRAUD_FEE_REAIS;