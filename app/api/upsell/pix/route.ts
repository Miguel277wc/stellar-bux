import { ANTIFRAUD_FEE_CENTS, ANTIFRAUD_FEE_REAIS } from "@/lib/catalog";
import {
  attachTaxPix,
  getStoredOrder,
  normalizeOrder,
  payerForOrder,
  publicOrder,
  putOrder,
  type StoreOrder,
} from "@/lib/orders";
import { allowCharge, CheckoutRejected } from "@/lib/charge-guard";
import { chargePix, pixErrorResponse, privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

type UpsellBody = { id?: string; order?: StoreOrder };

function buyerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || "local").slice(0, 80);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpsellBody;
    const id = String(body.id ?? "").trim();
    if (!id) throw new CheckoutRejected("Pedido não encontrado.");

    if (body.order?.id === id && !getStoredOrder(id)) {
      const normalized = normalizeOrder(body.order);
      putOrder({
        ...normalized,
        payer: {
          name: normalized.customer.name,
          email: normalized.customer.email,
          phone: normalized.customer.phone,
          document: normalized.customer.document,
        },
      });
    }

    const stored = getStoredOrder(id);
    if (!stored || !stored.principalPaid || stored.phase !== "taxa" || stored.taxPaid) {
      throw new CheckoutRejected("Este pedido não aceita a taxa agora.");
    }
    if (stored.taxPixId && stored.pix) {
      return privateJson({ order: publicOrder(stored) });
    }

    allowCharge(buyerKey(request));
    const payer = payerForOrder(id);
    if (!payer) throw new CheckoutRejected("Pedido não encontrado.");

    const pix = await chargePix({
      amountCents: ANTIFRAUD_FEE_CENTS,
      description: `Taxa Stellar Bux ${ANTIFRAUD_FEE_REAIS.toFixed(2).replace(".", ",")}`,
      reference: `${id}-taxa`,
      customer: payer,
    });

    const order = attachTaxPix(
      id,
      {
        id: pix.id,
        copyPaste: pix.copia_cola,
        qrCodeImage: pix.qr_code,
        amountCents: ANTIFRAUD_FEE_CENTS,
      },
      pix.id,
    );
    if (!order) throw new CheckoutRejected("Não foi possível gerar o PIX da taxa.");

    return privateJson({ order });
  } catch (error) {
    return pixErrorResponse(error);
  }
}