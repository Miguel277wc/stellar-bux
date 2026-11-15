import { CheckoutForm } from "./form";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ robux?: string; express?: string }>;
}) {
  const params = await searchParams;
  const robux = Number(params.robux ?? "600");
  return <CheckoutForm robux={robux} express={params.express === "1"} />;
}
