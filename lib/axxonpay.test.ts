import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  AxxonPayError,
  createPixCharge,
  loginAxxon,
  paymentIdFromWebhook,
  paymentView,
  verifyAxxonSignature,
} from "./axxonpay";

const credentials = {
  apiKey: "pk_test_example",
  apiSecret: "sk_test_example",
  baseUrl: "https://api.axxonpay.com.br",
};

test("o login envia apiKey e apiSecret para a Axxon Pay", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify({ token: "jwt-da-api" }), { status: 200 });
  };

  const token = await loginAxxon(credentials, fetchImpl);
  assert.equal(token, "jwt-da-api");
  assert.equal(calls[0]?.url, "https://api.axxonpay.com.br/api/v1/api-auth/login");
  assert.deepEqual(calls[0]?.body, {
    apiKey: "pk_test_example",
    apiSecret: "sk_test_example",
  });
});

test("o PIX faz login e cria o pagamento direto em centavos", async () => {
  const calls: Array<{ url: string; headers: Headers; body: unknown }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      headers,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(input).endsWith("/login")) {
      return new Response(JSON.stringify({ token: "jwt" }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        data: {
          id: "pay_1",
          status: "PENDING",
          qrCode: "00020126PIX",
          customer: { name: "Recebedor Axxon" },
        },
      }),
      { status: 201 },
    );
  };

  const charge = await createPixCharge(
    credentials,
    {
      amountCents: 790,
      description: "Pedido Galaxy Bux",
      customer: {
        name: "Stellar_01",
        email: "ana@email.com",
        phone: "(11) 98888-7777",
        document: "088.521.753-50",
      },
    },
    fetchImpl,
  );

  assert.equal(calls[1]?.url, "https://api.axxonpay.com.br/api/v1/direct/payment");
  assert.equal(calls[1]?.headers.get("axxon-gateway-publickey"), "pk_test_example");
  assert.equal(calls[1]?.headers.get("axxon-gateway-secretkey"), "sk_test_example");
  assert.equal((calls[1]?.body as { amount: number }).amount, 790);
  assert.equal((calls[1]?.body as { paymentMethod: string }).paymentMethod, "pix");
  assert.equal(
    (calls[1]?.body as { customer: { document: { type: string; number: string } } }).customer.document.number,
    "08852175350",
  );
  assert.equal(charge.qrCode, "00020126PIX");
  assert.equal(charge.view, "pending");
  assert.equal(charge.receiverName, "Recebedor Axxon");
});

test("FINISHED e PAID contam como pago", () => {
  assert.equal(paymentView("FINISHED"), "approved");
  assert.equal(paymentView("paid"), "approved");
  assert.equal(paymentView("PENDING"), "pending");
  assert.equal(paymentView("REFUNDED"), "refunded");
});

test("credencial recusada vira erro da Axxon Pay", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ errorMessage: "Credenciais inválidas." }), { status: 401 });

  await assert.rejects(
    () => loginAxxon(credentials, fetchImpl),
    (error: unknown) => error instanceof AxxonPayError && error.status === 401,
  );
});

test("a assinatura do webhook usa o corpo cru", () => {
  const secret = "whsec_test";
  const raw = '{"event":"payment.approved","data":{"id":"pay_1"}}';
  const timestamp = "1760450000";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");

  assert.equal(verifyAxxonSignature(raw, `t=${timestamp},v1=${signature}`, secret, 1760450000), true);
  assert.equal(verifyAxxonSignature(raw, `t=${timestamp},v1=${signature}`, secret, 1760450401), false);
  assert.equal(paymentIdFromWebhook(JSON.parse(raw)), "pay_1");
});
