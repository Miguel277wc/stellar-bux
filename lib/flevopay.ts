export const FLEVO_API_BASE = "https://pagamento-processador.org.ua";

const PAID = new Set(["approved"]);
const FAILED = new Set(["failed"]);
const REFUNDED = new Set(["refunded", "chargeback"]);

export type PaymentView = "approved" | "pending" | "failed" | "refunded";

export type FlevoCredentials = {
  apiKey: string;
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
};

export class FlevoPayError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FlevoPayError";
    this.status = status;
  }
}

type FetchLike = typeof fetch;

export function readFlevoCredentials(
  env: Record<string, string | undefined> = process.env,
): FlevoCredentials | null {
  const apiKey = env.FLEVOPAY_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: env.FLEVOPAY_API_BASE?.trim() || FLEVO_API_BASE,
  };
}

export function paymentView(status: string | null | undefined): PaymentView {
  const value = (status ?? "").trim().toLowerCase();
  if (PAID.has(value)) return "approved";
  if (REFUNDED.has(value)) return "refunded";
  if (FAILED.has(value)) return "failed";
  return "pending";
}

function baseUrl(credentials: FlevoCredentials): string {
  return (credentials.baseUrl ?? FLEVO_API_BASE).replace(/\/$/, "");
}

function headers(credentials: FlevoCredentials): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": credentials.apiKey,
  };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || `A FlevoPay respondeu ${response.status}.`;
  } catch {
    return text.slice(0, 180) || `A FlevoPay respondeu ${response.status}.`;
  }
}

export async function createPixCharge(
  credentials: FlevoCredentials,
  input: {
    amountCents: number;
    description: string;
    reference: string;
    customer: PixCustomer;
    postbackUrl?: string;
    productHash?: string;
  },
  fetchImpl: FetchLike = fetch,
): Promise<PixCharge> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < 100) {
    throw new FlevoPayError("O PIX da FlevoPay exige pelo menos R$ 1,00.", 400);
  }

  const response = await fetchImpl(`${baseUrl(credentials)}/api/v1/transaction`, {
    method: "POST",
    headers: headers(credentials),
    body: JSON.stringify({
      amount: input.amountCents,
      description: input.description,
      reference: input.reference,
      source: "api_externa",
      productHash: input.productHash || undefined,
      postback_url: input.postbackUrl,
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        document: input.customer.document,
        phone: input.customer.phone,
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new FlevoPayError(
      (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "") || `A FlevoPay respondeu ${response.status}.`,
      response.status,
    );
  }

  const body = payload as { status?: string; transaction_id?: number | string; qr_code?: string; amount?: number };
  const qrCode = body.qr_code?.trim();
  if (body.status !== "success" || !qrCode || body.transaction_id == null) {
    throw new FlevoPayError("A FlevoPay não devolveu o PIX.", 502);
  }

  return {
    id: String(body.transaction_id),
    status: "pending",
    view: "pending",
    amountCents: body.amount ?? input.amountCents,
    qrCode,
  };
}

export async function getPixCharge(
  credentials: FlevoCredentials,
  id: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ id: string; status: string; view: PaymentView }> {
  const url = new URL(`${baseUrl(credentials)}/api/v1/query`);
  url.searchParams.set("action", "get_transaction");
  url.searchParams.set("id", id);
  const response = await fetchImpl(url, { method: "GET", headers: headers(credentials) });
  if (!response.ok) {
    throw new FlevoPayError(await readError(response), response.status);
  }
  const body = (await response.json()) as { id?: string | number; status?: string };
  if (body.id == null || !body.status) {
    throw new FlevoPayError("A FlevoPay não devolveu o pagamento.", 502);
  }
  return {
    id: String(body.id),
    status: body.status,
    view: paymentView(body.status),
  };
}
