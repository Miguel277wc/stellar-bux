import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { AxxonPayError, createPixCharge, readAxxonCredentials, type PixCustomer } from "./axxonpay";

const GENERIC_PROVIDER_ERROR =
  "Não foi possível processar seu pagamento. Por favor, verifique os dados informados ou contate o suporte.";

export function explainPixFailure(message: string): string {
  if (message.trim() === GENERIC_PROVIDER_ERROR) {
    return "A Axxon Pay recusou o pagador. Confira nome e sobrenome, CPF válido, celular com DDD e um total de pelo menos R$ 6,00. Se os dados já estão certos, ative o PIX da conta ou troque a adquirente no painel da Axxon Pay.";
  }
  return message;
}

export function pixErrorResponse(error: unknown) {
  if (error instanceof AxxonPayError && (error.status === 401 || error.status === 403)) {
    return NextResponse.json(
      {
        error:
          "A Axxon Pay recusou as chaves. Copie a chave pública e a secreta em Integrações → Credenciais da API. O par de exemplo da documentação não gera PIX.",
      },
      { status: 502 },
    );
  }
  if (error instanceof AxxonPayError && error.status >= 400 && error.status < 500) {
    return NextResponse.json({ error: explainPixFailure(error.message) }, { status: 400 });
  }
  if (error instanceof AxxonPayError && error.message && error.message !== "O PIX não pode ser gerado.") {
    return NextResponse.json({ error: explainPixFailure(error.message) }, { status: 502 });
  }
  if (error instanceof Error && /SKU|Quantidade|pelo menos um item/.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "O PIX não pode ser gerado." }, { status: 502 });
}

export async function chargePix(input: {
  amountCents: number;
  description: string;
  customer: PixCustomer;
  metadata: Record<string, string>;
}) {
  const credentials = readAxxonCredentials();
  if (!credentials) {
    throw new AxxonPayError("O PIX não pode ser gerado.", 503);
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
  return NextResponse.json({ error: "O PIX não pode ser gerado." }, { status: 503 });
}
