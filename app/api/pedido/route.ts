import { getStoredOrder, normalizeOrder, publicOrder, putOrder, refreshOrderPayment, type StoreOrder } from "@/lib/orders";
import { privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

async function publish(id: string) {
  const order = await refreshOrderPayment(id);
  if (!order) return privateJson({ error: "Pedido não encontrado." }, 404);
  return privateJson({ order: publicOrder(order) });
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return privateJson({ error: "Pedido não encontrado." }, 404);
  return publish(id);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; order?: StoreOrder };
  const id = body.order?.id ?? body.id?.trim() ?? "";
  if (!id) return privateJson({ error: "Pedido não encontrado." }, 404);

  if (body.order?.id === id && !getStoredOrder(id)) {
    const normalized = normalizeOrder(body.order);
    putOrder({
      ...normalized,
      payer: {
        name: normalized.customer.name,
        email: normalized.customer.email,
        phone: normalized.customer.phone,
        document: normalized.customer.document,
      },
    });
  }

  return publish(id);
}