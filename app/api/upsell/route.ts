import { quoteUpsell } from "@/lib/catalog";
import { chargeCaller } from "@/lib/charge-caller";
import { allowCharge, assertCheckoutAmount } from "@/lib/charge-guard";
import { pixCustomerFromInput, type CheckoutCustomerInput } from "@/lib/checkout-customer";
import { chargePix, pixErrorResponse, privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const caller = await chargeCaller(request);
  if (caller instanceof Response) return caller;

  try {
    const body = (await request.json()) as { customer?: CheckoutCustomerInput };
    const quote = quoteUpsell();
    assertCheckoutAmount(quote.amountCents);
    const customer = pixCustomerFromInput(body.customer ?? {});
    allowCharge(caller.sub);
    const pix = await chargePix({
      amountCents: quote.amountCents,
      description: quote.description,
      customer,
      metadata: {
        kind: "upsell",
        roblox_username: body.customer?.roblox_username?.trim() ?? customer.name,
      },
    });
    return privateJson(pix);
  } catch (error) {
    return pixErrorResponse(error);
  }
}
