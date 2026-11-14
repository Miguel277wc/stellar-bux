import assert from "node:assert/strict";
import test from "node:test";
import { assertCheckoutAmount, assertCheckoutOrder, CheckoutRejected, createChargeWindow } from "./charge-guard";

test("só aceita um pacote da loja, com quantidade 1", () => {
  assert.doesNotThrow(() => assertCheckoutOrder([{ sku: "r1000", quantity: 1 }]));
  assert.throws(() => assertCheckoutOrder([{ sku: "r1000", quantity: 40 }]), CheckoutRejected);
  assert.throws(() => assertCheckoutOrder([{ sku: "r999999", quantity: 1 }]), CheckoutRejected);
  assert.throws(
    () =>
      assertCheckoutOrder([
        { sku: "r1000", quantity: 1 },
        { sku: "r2500", quantity: 1 },
      ]),
    CheckoutRejected,
  );
});

test("recusa valor abaixo de R$ 6 ou acima do maior pacote", () => {
  assert.doesNotThrow(() => assertCheckoutAmount(9190));
  assert.throws(() => assertCheckoutAmount(599), CheckoutRejected);
  assert.throws(() => assertCheckoutAmount(9191), CheckoutRejected);
});

test("cada pessoa gera no máximo cinco cobranças por hora", () => {
  const allow = createChargeWindow(5, 60_000);
  for (let n = 0; n < 5; n += 1) allow("user:1", 1_000);
  assert.throws(() => allow("user:1", 1_000), (error: unknown) => error instanceof CheckoutRejected && error.status === 429);
  assert.doesNotThrow(() => allow("user:2", 1_000));
  assert.doesNotThrow(() => allow("user:1", 61_000));
});
