import { NextResponse } from "next/server";
import {
  getPixCharge,
  paymentIdFromWebhook,
  readAxxonCredentials,
  webhookIsTrusted,
} from "@/lib/axxonpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!webhookIsTrusted(raw, request.headers.get("axxon-signature"), process.env.AXXONPAY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Assinatura obrigatória." }, { status: 401 });
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
