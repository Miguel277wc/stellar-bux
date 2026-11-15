import { PedidoView } from "./pedido-view";

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; concluido?: string }>;
}) {
  const params = await searchParams;
  return <PedidoView id={params.id ?? ""} done={params.concluido === "1"} />;
}