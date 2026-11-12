import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { AxxonPayError, createPixCharge, readAxxonCredentials, type PixCustomer } from "./axxonpay";

export function pixErrorResponse(error: unknown) {
  if (error instanceof AxxonPayError && error.status === 400) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
