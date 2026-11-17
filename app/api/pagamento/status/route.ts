import { FlevoPayError, getPixCharge, readFlevoCredentials } from "@/lib/flevopay";
import { pixUnavailable, privateJson } from "@/lib/pix-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
    return privateJson({ error: "Informe o pagamento." }, 400);
  }

  const credentials = readFlevoCredentials();
  if (!credentials) return pixUnavailable();

  try {
    const payment = await getPixCharge(credentials, id);
    return privateJson({
      id: payment.id,
      status: payment.view,
      provider_status: payment.status,
    });
  } catch (error) {
    if (error instanceof FlevoPayError && error.status === 404) {
      return privateJson({ error: "Pagamento não encontrado." }, 404);
    }
    return privateJson({ error: "Não foi possível consultar o PIX." }, 502);
  }
}
