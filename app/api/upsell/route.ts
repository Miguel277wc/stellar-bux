import { NextResponse } from "next/server";
import { quoteUpsell } from "@/lib/catalog";
import { pixCustomerFromInput, type CheckoutCustomerInput } from "@/lib/checkout-customer";
import { chargePix, pixErrorResponse } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { customer?: CheckoutCustomerInput };
    const quote = quoteUpsell();
    const customer = pixCustomerFromInput(body.customer ?? {});
    const pix = await chargePix({
      amountCents: quote.amountCents,
      description: quote.description,
      customer,
      metadata: {
        kind: "upsell",
        roblox_username: body.customer?.roblox_username?.trim() ?? customer.name,
      },
    });
    return NextResponse.json(pix);
  } catch (error) {
    return pixErrorResponse(error);
  }
}
