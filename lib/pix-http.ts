import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { AxxonPayError, createPixCharge, readAxxonCredentials, type PixCustomer } from "./axxonpay";
import { CheckoutRejected } from "./charge-guard";

const GENERIC_PROVIDER_ERROR =
  "Não foi possível processar seu pagamento. Por favor, verifique os dados informados ou contate o suporte.";

export function explainPixFailure(message: string): string {
  if (message.trim() === GENERIC_PROVIDER_ERROR) {
    return "A Sicredi recusou a cobrança na Axxon Pay. Confira nome e sobrenome, CPF válido, celular com DDD e um total de pelo menos R$ 6,00. Se os dados já estão certos, o cadastro da Sicredi no painel está incompleto: chave Pix, certificado da API Pix, client id, client secret, cooperativa, posto e código do beneficiário.";
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
  if (error instanceof AxxonPayError && (error.status === 401 || error.status === 403)) {
    return privateJson(
      {
        error:
          "A Axxon Pay recusou as chaves. Copie a chave pública e a secreta em Integrações → Credenciais da API. O par de exemplo da documentação não gera PIX.",
      },
      502,
    );
  }
  if (error instanceof AxxonPayError && error.status >= 400 && error.status < 500) {
    return privateJson({ error: explainPixFailure(error.message) }, 400);
  }
  if (error instanceof AxxonPayError && error.message && error.message !== "O PIX não pode ser gerado.") {
    return privateJson({ error: explainPixFailure(error.message) }, 502);
  }
  if (error instanceof Error && /SKU|Quantidade|pelo menos um item/.test(error.message)) {
    return privateJson({ error: error.message }, 400);
  }
  return privateJson({ error: "O PIX não pode ser gerado." }, 502);
}

export async function chargePix(input: {
  amountCents: number;
  description: string;
  customer: PixCustomer;
  metadata: Record<string, string>;
}) {
  const credentials = readAxxonCredentials();
  if (!credentials) {
    throw new AxxonPayError(
      "As chaves da Axxon Pay não estão no servidor. Defina AXXONPAY_API_KEY e AXXONPAY_API_SECRET.",
      503,
    );
  }

  const charge = await createPixCharge(credentials, {
    amountCents: input.amountCents,
    description: input.description,
    customer: input.customer,
    metadata: input.metadata,
    postbackUrl: process.env.AXXONPAY_POSTBACK_URL?.trim() || undefined,
  });
  const qrCode = await QRCode.toDataURL(charge.qrCode, { margin: 1, width: 280 });

  return {
    id: charge.id,
    status: charge.view,
    amount_cents: input.amountCents,
    description: input.description,
    copia_cola: charge.qrCode,
    qr_code: qrCode,
    receiver_name: charge.receiverName,
    checkout_url: null,
  };
}

export function pixUnavailable() {
  return privateJson({ error: "O PIX não pode ser gerado." }, 503);
}
