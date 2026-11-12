import { AxxonPayError, getPixCharge, readAxxonCredentials } from "@/lib/axxonpay";
import { chargeCaller } from "@/lib/charge-caller";
import { pixUnavailable, privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const caller = await chargeCaller(request);
  if (caller instanceof Response) return caller;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return privateJson({ error: "Informe o pagamento." }, 400);
  }

  const credentials = readAxxonCredentials();
  if (!credentials) return pixUnavailable();

  try {
    const payment = await getPixCharge(credentials, id);
    return privateJson({
      id: payment.id,
      status: payment.view,
      provider_status: payment.status,
    });
  } catch (error) {
    if (error instanceof AxxonPayError && error.status === 404) {
      return privateJson({ error: "Pagamento não encontrado." }, 404);
    }
    return privateJson({ error: "O PIX não pode ser gerado." }, 502);
  }
}
