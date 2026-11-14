import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { FlevoPayError, createPixCharge, readFlevoCredentials, type PixCustomer } from "./flevopay";
import { CheckoutRejected } from "./charge-guard";

const GENERIC_FLEVO_ERROR =
  "Não foi possível processar seu pagamento. Por favor, verifique os dados informados ou contate o suporte.";

export function explainFlevoFailure(message: string): string {
  if (message.trim() === GENERIC_FLEVO_ERROR) {
    return "A FlevoPay não gerou o PIX. Confira nome e sobrenome, CPF válido e celular com DDD. Se os dados já estão certos, a adquirente da loja recusou a cobrança.";
  }
  return message;
}

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export function pixErrorResponse(error: unknown) {
  if (error instanceof CheckoutRejected) {
    return privateJson({ error: error.message }, error.status);
  }
  if (error instanceof FlevoPayError && (error.status === 401 || error.status === 403)) {
    return privateJson({ error: "A FlevoPay recusou a chave. Confira a chave secreta no painel." }, 502);
  }
  if (error instanceof FlevoPayError && error.status >= 400 && error.status < 500) {
    return privateJson({ error: explainFlevoFailure(error.message) }, 400);
  }
  if (error instanceof FlevoPayError && error.message) {
    return privateJson({ error: error.message }, 502);
  }
  if (error instanceof Error && /SKU|Quantidade|pelo menos um item|Pacote/.test(error.message)) {
    return privateJson({ error: error.message }, 400);
  }
  return privateJson({ error: "O PIX não pode ser gerado." }, 502);
}

export async function chargePix(input: {
  amountCents: number;
  description: string;
  reference: string;
  customer: PixCustomer;
}) {
  const credentials = readFlevoCredentials();
  if (!credentials) {
    throw new FlevoPayError("A chave da FlevoPay não está no servidor. Defina FLEVOPAY_API_KEY.", 503);
  }

  const charge = await createPixCharge(credentials, {
    amountCents: input.amountCents,
    description: input.description,
    reference: input.reference,
    customer: input.customer,
    postbackUrl: process.env.FLEVOPAY_POSTBACK_URL?.trim() || undefined,
    productHash: process.env.FLEVOPAY_STORE_ID?.trim() || undefined,
  });
  const qrCode = charge.qrCode.startsWith("data:image")
    ? charge.qrCode
    : await QRCode.toDataURL(charge.qrCode, { margin: 1, width: 280 });

  return {
    id: charge.id,
    status: charge.view,
    amount_cents: input.amountCents,
    description: input.description,
    copia_cola: charge.qrCode.startsWith("data:image") ? "" : charge.qrCode,
    qr_code: qrCode,
  };
}

export function pixUnavailable() {
  return privateJson({ error: "O PIX não pode ser gerado." }, 503);
}
