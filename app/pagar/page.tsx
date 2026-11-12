import QRCode from "qrcode";
import { READY_PIX } from "@/lib/ready-pix";

export const dynamic = "force-static";

export default async function PagarPage() {
  const qrCode = await QRCode.toDataURL(READY_PIX.copiaCola, { margin: 1, width: 280 });

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <h1>Pague o PIX</h1>
      <p>{READY_PIX.amountLabel}</p>
      <img src={qrCode} alt="QR Code PIX" width={280} height={280} />
      <textarea readOnly value={READY_PIX.copiaCola} rows={4} style={{ width: "100%" }} aria-label="PIX copia e cola" />
    </main>
  );
}
