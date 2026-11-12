import { NextResponse } from "next/server";
import {
  getPixCharge,
  paymentIdFromWebhook,
  readAxxonCredentials,
  verifyAxxonSignature,
} from "@/lib/axxonpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.AXXONPAY_WEBHOOK_SECRET?.trim();
  if (secret && !verifyAxxonSignature(raw, request.headers.get("axxon-signature"), secret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const id = paymentIdFromWebhook(payload);
  if (!id) return NextResponse.json({ received: true });

  const credentials = readAxxonCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "O PIX não pode ser gerado." }, { status: 503 });
  }

  try {
    const payment = await getPixCharge(credentials, id);
    if (payment.view !== "approved") {
      return NextResponse.json({ received: true, status: payment.view }, { status: 202 });
    }
    return NextResponse.json({ received: true, status: "approved" });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar o pagamento." }, { status: 502 });
  }
}
