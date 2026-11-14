import { getPixCharge, readFlevoCredentials } from "@/lib/flevopay";
import { privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { transaction_id?: unknown };
  try {
    payload = (await request.json()) as { transaction_id?: unknown };
  } catch {
    return privateJson({ error: "JSON inválido." }, 400);
  }

  const id = payload.transaction_id == null ? "" : String(payload.transaction_id).trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
    return privateJson({ error: "Pagamento inválido." }, 400);
  }

  const credentials = readFlevoCredentials();
  if (!credentials) return privateJson({ error: "O PIX não pode ser gerado." }, 503);

  try {
    const payment = await getPixCharge(credentials, id);
    return privateJson({ received: true, status: payment.view }, payment.view === "approved" ? 200 : 202);
  } catch {
    return privateJson({ error: "Não foi possível confirmar o pagamento." }, 502);
  }
}
