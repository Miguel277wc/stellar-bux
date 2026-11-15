import { quoteCheckout } from "@/lib/catalog";
import { allowCharge, assertCheckoutAmount, assertCheckoutOrder } from "@/lib/charge-guard";
import { pixCustomerFromInput, type CheckoutCustomerInput } from "@/lib/checkout-customer";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    assertCheckoutOrder(body.items);
    const quote = quoteCheckout(
      (body.items ?? []).map((item) => ({
        sku: String(item.sku ?? ""),
        quantity: Number(item.quantity),
      })),
      Boolean(body.express ?? body.fastDelivery),
    );
    assertCheckoutAmount(quote.amountCents);
    allowCharge(buyerKey(request));
    const customer = pixCustomerFromInput(body.customer ?? {});
    const pix = await chargePix({
      amountCents: quote.amountCents,
      description: quote.description,
      reference: `sbx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      customer,
    });
    return privateJson(pix);
  } catch (error) {
    return pixErrorResponse(error);
  }
}
