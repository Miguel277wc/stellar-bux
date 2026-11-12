import assert from "node:assert/strict";
import test from "node:test";
import { AxxonPayError } from "./axxonpay";
import { explainPixFailure } from "./pix-http";
import { payerDocument, payerName, payerPhone, pixCustomerFromInput } from "./checkout-customer";

test("telefone com 55 vira DDD mais número", () => {
  assert.equal(payerPhone("+55 (11) 98888-7777"), "11988887777");
  assert.equal(payerPhone("11988887777"), "11988887777");
});

test("nome precisa de nome e sobrenome", () => {
  assert.equal(payerName("  Ana   Silva "), "Ana Silva");
  assert.equal(payerName("João Silva_01"), "João Silva");
  assert.throws(() => payerName("Stellar_01"), AxxonPayError);
});

test("CPF e CNPJ passam pelo dígito verificador", () => {
  assert.equal(payerDocument("088.521.753-50"), "08852175350");
  assert.equal(payerDocument("11.444.777/0001-61"), "11444777000161");
  assert.throws(() => payerDocument("111.111.111-11"), /CPF informado não é válido/);
});

test("o checkout monta o pagador que a Axxon aceita", () => {
  const customer = pixCustomerFromInput({
    name: "Ana Silva",
    email: "ana@email.com",
    phone: "5511988887777",
    document: "08852175350",
    roblox_username: "Stellar_01",
  });
  assert.deepEqual(customer, {
    name: "Ana Silva",
    email: "ana@email.com",
    phone: "11988887777",
    document: "08852175350",
  });
});

test("a frase genérica da Axxon vira o que conferir", () => {
  const explained = explainPixFailure(
    "Não foi possível processar seu pagamento. Por favor, verifique os dados informados ou contate o suporte.",
  );
  assert.match(explained, /Sicredi/);
  assert.match(explained, /nome e sobrenome/);
  assert.match(explained, /R\$ 6,00/);
});
