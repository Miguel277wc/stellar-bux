import assert from "node:assert/strict";
import test from "node:test";
import { createPixCharge, getPixCharge, paymentView, type FlevoCredentials } from "./flevopay";

const credentials: FlevoCredentials = {
  apiKey: "flevopay_sk_test",
  baseUrl: "https://pagamento-processador.org.ua",
};

test("o PIX sai em centavos com a chave no cabeçalho", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        status: "success",
        transaction_id: 238,
        id: "sbx-1",
        qr_code: "00020126PIX",
        amount: 790,
      }),
      { status: 200 },
    );
  };

  const charge = await createPixCharge(
    credentials,
    {
      amountCents: 790,
      description: "1000 Robux",
      reference: "sbx-1",
      customer: {
        name: "Ana Silva",
        email: "ana@email.com",
        phone: "11988887777",
        document: "08852175350",
      },
    },
    fetchImpl,
  );

  assert.equal(charge.id, "238");
  assert.equal(charge.qrCode, "00020126PIX");
  assert.equal(calls[0]?.url, "https://pagamento-processador.org.ua/api/v1/transaction");
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get("x-api-key"), "flevopay_sk_test");
  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.equal(body.amount, 790);
  assert.equal(body.source, "api_externa");
  assert.equal(body.customer.document, "08852175350");
});

test("approved conta como pago", () => {
  assert.equal(paymentView("approved"), "approved");
  assert.equal(paymentView("pending"), "pending");
  assert.equal(paymentView("refunded"), "refunded");
});

test("a consulta usa o id da FlevoPay", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    assert.equal(
      String(input),
      "https://pagamento-processador.org.ua/api/v1/query?action=get_transaction&id=238",
    );
    return new Response(JSON.stringify({ id: 238, status: "approved", external_id: "sbx-1" }), { status: 200 });
  };
  const payment = await getPixCharge(credentials, "238", fetchImpl);
  assert.equal(payment.view, "approved");
});
