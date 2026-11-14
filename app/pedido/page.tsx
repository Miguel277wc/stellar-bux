import { PedidoStatus } from "./status";

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  return <PedidoStatus id={params.id ?? ""} />;
}
