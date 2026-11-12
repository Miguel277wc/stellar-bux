import { createHmac, timingSafeEqual } from "node:crypto";

export const AXXON_API_BASE = "https://api.axxonpay.com.br";
export const PIX_MIN_CENTS = 600;

const PAID_STATUSES = new Set(["FINISHED", "PAID", "APPROVED", "COMPLETED"]);
const FAILED_STATUSES = new Set(["FAILED", "REFUSED", "CANCELLED", "CANCELED", "EXPIRED"]);

export type PaymentView = "approved" | "pending" | "failed" | "refunded";

export type AxxonCredentials = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
};

export type PixCustomer = {
  name: string;
  email: string;
  phone: string;
  document: string;
};

export type PixCharge = {
  id: string;
  status: string;
  view: PaymentView;
  amountCents: number;
  qrCode: string;
  receiverName: string | null;
};

export class AxxonPayError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AxxonPayError";
    this.status = status;
  }
}

type FetchLike = typeof fetch;

export function readAxxonCredentials(
  env: Record<string, string | undefined> = process.env,
): AxxonCredentials | null {
  const apiKey = env.AXXONPAY_API_KEY?.trim();
  const apiSecret = env.AXXONPAY_API_SECRET?.trim();
  if (!apiKey || !apiSecret) return null;
  return {
    apiKey,
    apiSecret,
    baseUrl: env.AXXONPAY_API_BASE?.trim() || AXXON_API_BASE,
  };
}

export function paymentView(status: string | null | undefined): PaymentView {
  const value = (status ?? "").trim().toUpperCase();
  if (PAID_STATUSES.has(value)) return "approved";
  if (value === "REFUNDED") return "refunded";
  if (FAILED_STATUSES.has(value)) return "failed";
  return "pending";
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function pixDescription(value: string): string {
  const cleaned = value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return (cleaned || "Pedido").slice(0, 140);
}

export function documentType(document: string): "cpf" | "cnpj" {
  const digits = onlyDigits(document);
  if (digits.length === 14) return "cnpj";
  if (digits.length === 11) return "cpf";
  throw new AxxonPayError("O PIX da Axxon Pay exige um CPF ou CNPJ válido.", 400);
}

function baseUrl(credentials: AxxonCredentials): string {
  return (credentials.baseUrl ?? AXXON_API_BASE).replace(/\/$/, "");
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { errorMessage?: string; message?: string };
    return body.errorMessage || body.message || `Axxon Pay respondeu ${response.status}.`;
  } catch {
    return text.slice(0, 180) || `Axxon Pay respondeu ${response.status}.`;
  }
}

export async function loginAxxon(
  credentials: AxxonCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const response = await fetchImpl(`${baseUrl(credentials)}/api/v1/api-auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
    }),
  });

  if (!response.ok) {
    throw new AxxonPayError(await readError(response), response.status);
  }

  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new AxxonPayError("A Axxon Pay não devolveu o token do login.", 502);
  }
  return body.token;
}

function gatewayHeaders(credentials: AxxonCredentials): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "axxon-gateway-publickey": credentials.apiKey,
    "axxon-gateway-secretkey": credentials.apiSecret,
  };
}

type RawCharge = {
  id?: string;
  status?: string;
  amount?: number;
  qrCode?: string | null;
  customer?: { name?: string | null };
  customerName?: string | null;
};

export function providerMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as {
    errorMessage?: unknown;
    message?: unknown;
    data?: { errorMessage?: unknown; message?: unknown };
  };
  const candidates = [body.errorMessage, body.message, body.data?.errorMessage, body.data?.message];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function asCharge(payload: unknown, fallbackAmountCents: number): PixCharge {
  const root = (payload ?? {}) as { data?: RawCharge } & RawCharge;
  const data = root.data && typeof root.data === "object" ? root.data : root;
  if (!data.id || !data.qrCode) {
    throw new AxxonPayError(providerMessage(payload) || "A Axxon Pay não devolveu o PIX.", 502);
  }
  return {
    id: data.id,
    status: data.status ?? "PENDING",
    view: paymentView(data.status),
    amountCents: fallbackAmountCents,
    qrCode: data.qrCode,
    receiverName: data.customer?.name ?? data.customerName ?? null,
  };
}

export async function createPixCharge(
  credentials: AxxonCredentials,
  input: {
    amountCents: number;
    description: string;
    customer: PixCustomer;
    postbackUrl?: string;
    metadata?: Record<string, string>;
  },
  fetchImpl: FetchLike = fetch,
): Promise<PixCharge> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
    throw new AxxonPayError("O valor do PIX precisa ser um inteiro em centavos.", 400);
  }
  if (input.amountCents < PIX_MIN_CENTS) {
    throw new AxxonPayError("O PIX da Axxon Pay só é gerado a partir de R$ 6,00.", 400);
  }

  await loginAxxon(credentials, fetchImpl);

  const response = await fetchImpl(`${baseUrl(credentials)}/api/v1/direct/payment`, {
    method: "POST",
    headers: gatewayHeaders(credentials),
    body: JSON.stringify({
      amount: input.amountCents,
      paymentMethod: "pix",
      currency: "BRL",
      environment: "br",
      description: pixDescription(input.description),
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: onlyDigits(input.customer.phone),
        document: {
          number: onlyDigits(input.customer.document),
          type: documentType(input.customer.document),
        },
      },
      items: [
        {
          title: pixDescription(input.description),
          unitPrice: input.amountCents,
          quantity: 1,
        },
      ],
      ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AxxonPayError(
      providerMessage(payload) || `Axxon Pay respondeu ${response.status}.`,
      response.status,
    );
  }

  return asCharge(payload, input.amountCents);
}

export async function getPixCharge(
  credentials: AxxonCredentials,
  id: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ id: string; status: string; view: PaymentView; receiverName: string | null }> {
  const response = await fetchImpl(`${baseUrl(credentials)}/api/v1/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: gatewayHeaders(credentials),
  });

  if (!response.ok) {
    throw new AxxonPayError(await readError(response), response.status);
  }

  const body = (await response.json()) as { data?: RawCharge } & RawCharge;
  const data = body.data && typeof body.data === "object" ? body.data : body;
  if (!data.id) {
    throw new AxxonPayError("A Axxon Pay não devolveu o pagamento.", 502);
  }
  return {
    id: data.id,
    status: data.status ?? "PENDING",
    view: paymentView(data.status),
    receiverName: data.customer?.name ?? data.customerName ?? null,
  };
}

export function verifyAxxonSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Date.now() / 1000,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((part) => part.split("=", 2))
      .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0])),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(nowSeconds - sentAt) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export function paymentIdFromWebhook(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as {
    id?: string;
    data?: { id?: string };
    transaction?: { id?: string };
  };
  return body.data?.id || body.transaction?.id || body.id || null;
}
