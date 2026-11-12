import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { AxxonPayError, getPixCharge, readAxxonCredentials } from "@/lib/axxonpay";
import { pixUnavailable } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Informe o pagamento." }, { status: 400 });
  }

  const credentials = readAxxonCredentials();
  if (!credentials) return pixUnavailable();

  try {
    const payment = await getPixCharge(credentials, id);
    const qrCode = payment.qrCode
      ? await QRCode.toDataURL(payment.qrCode, { margin: 1, width: 280 })
      : null;
    return NextResponse.json({
      id: payment.id,
      status: payment.view,
      provider_status: payment.status,
      receiver_name: payment.receiverName,
      copia_cola: payment.qrCode,
      qr_code: qrCode,
    });
  } catch (error) {
    if (error instanceof AxxonPayError && error.status === 404) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "O PIX não pode ser gerado." }, { status: 502 });
  }
}
