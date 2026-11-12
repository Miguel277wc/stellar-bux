import QRCode from "qrcode";
import { READY_PIX } from "@/lib/ready-pix";

export const dynamic = "force-static";

export default async function PagarPage() {
  const qrCode = await QRCode.toDataURL(READY_PIX.copiaCola, { margin: 1, width: 280 });

  return (
    <div className="shop">
      <header className="shop-top">
        <div className="brand">Stellar Bux</div>
        <div className="secure">Pagamento seguro</div>
      </header>
      <section className="card pix-panel" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1>Escaneie o QR Code para pagar</h1>
        <p className="hint">{READY_PIX.amountLabel}</p>
        <img src={qrCode} alt="QR Code PIX" width={220} height={220} />
        <p className="hint">Código Pix copia e cola</p>
        <textarea className="pix-code" readOnly value={READY_PIX.copiaCola} aria-label="Código Pix copia e cola" />
        <p className="hint">Abra o app do seu banco e use a câmera para escanear o código.</p>
      </section>
      <p className="foot">Pagamento seguro e criptografado</p>
    </div>
  );
}
