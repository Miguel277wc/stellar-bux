import { UpsellView } from "./upsell-view";

export default async function UpsellPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  return <UpsellView id={params.id ?? ""} />;
}