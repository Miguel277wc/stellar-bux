import { NextResponse } from "next/server";
import { quoteCheckout } from "@/lib/catalog";
import { pixCustomerFromInput, type CheckoutCustomerInput } from "@/lib/checkout-customer";
import { chargePix, pixErrorResponse } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  items?: Array<{ sku?: string; quantity?: number }>;
  express?: boolean;
  customer?: CheckoutCustomerInput;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const quote = quoteCheckout(
      (body.items ?? []).map((item) => ({
        sku: String(item.sku ?? ""),
        quantity: Number(item.quantity),
      })),
      Boolean(body.express),
    );
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
    return NextResponse.json(pix);
  } catch (error) {
    return pixErrorResponse(error);
  }
}
