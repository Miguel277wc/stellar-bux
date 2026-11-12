import { quoteCheckout } from "@/lib/catalog";
import { chargeCaller } from "@/lib/charge-caller";
import { allowCharge, assertCheckoutAmount, assertCheckoutOrder } from "@/lib/charge-guard";
import { pixCustomerFromInput, type CheckoutCustomerInput } from "@/lib/checkout-customer";
import { chargePix, pixErrorResponse, privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  items?: Array<{ sku?: string; quantity?: number }>;
  express?: boolean;
  customer?: CheckoutCustomerInput;
};

export async function POST(request: Request) {
  const caller = await chargeCaller(request);
  if (caller instanceof Response) return caller;

  try {
    const body = (await request.json()) as CheckoutBody;
    assertCheckoutOrder(body.items);
    const quote = quoteCheckout(
      (body.items ?? []).map((item) => ({
        sku: String(item.sku ?? ""),
        quantity: Number(item.quantity),
      })),
      Boolean(body.express),
    );
    assertCheckoutAmount(quote.amountCents);
    allowCharge(caller.sub);
    const customer = pixCustomerFromInput(body.customer ?? {});
    const pix = await chargePix({
      amountCents: quote.amountCents,
      description: quote.description,
      customer,
      metadata: {
        kind: "checkout",
        roblox_username: body.customer?.roblox_username?.trim() ?? customer.name,
      },
    });
    return privateJson(pix);
  } catch (error) {
    return pixErrorResponse(error);
  }
}
