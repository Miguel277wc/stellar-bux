import { quoteCheckout } from "@/lib/catalog";
import { allowCharge, assertCheckoutAmount, assertCheckoutOrder } from "@/lib/charge-guard";
import { pixCustomerFromInput, type CheckoutCustomerInput } from "@/lib/checkout-customer";
import { createOrder, publicOrder } from "@/lib/orders";
import { chargePix, pixErrorResponse, privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  items?: Array<{ sku?: string; quantity?: number }>;
  express?: boolean;
  fastDelivery?: boolean;
  customer?: CheckoutCustomerInput;
};

function buyerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || "local").slice(0, 80);
}

function newOrderId() {
  return `SB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    assertCheckoutOrder(body.items);
    const express = Boolean(body.express ?? body.fastDelivery);
    const quote = quoteCheckout(
      (body.items ?? []).map((item) => ({
        sku: String(item.sku ?? ""),
        quantity: Number(item.quantity),
      })),
      express,
    );
    assertCheckoutAmount(quote.amountCents);
    allowCharge(buyerKey(request));
    const customer = pixCustomerFromInput(body.customer ?? {});
    const roblox = String(body.customer?.roblox_username ?? "").trim();
    const orderId = newOrderId();
    const pix = await chargePix({
      amountCents: quote.amountCents,
      description: quote.description,
      reference: orderId,
      customer,
    });
    const order = createOrder({
      id: orderId,
      quote,
      customer: { ...customer, roblox_username: roblox },
      fastDelivery: express,
      principalPixId: pix.id,
      pix: {
        id: pix.id,
        copyPaste: pix.copia_cola,
        qrCodeImage: pix.qr_code,
        amountCents: quote.amountCents,
      },
    });
    const published = publicOrder(order);
    return privateJson({
      checkout_url: `/pedido?id=${encodeURIComponent(orderId)}`,
      order: published,
      id: pix.id,
      status: pix.status,
      amount_cents: quote.amountCents,
      description: quote.description,
      copia_cola: pix.copia_cola,
      qr_code: pix.qr_code,
    });
  } catch (error) {
    return pixErrorResponse(error);
  }
}