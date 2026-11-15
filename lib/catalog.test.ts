import assert from "node:assert/strict";
import test from "node:test";
import { CENTS_PER_STEP, EXPRESS_DELIVERY_CENTS, quoteCheckout } from "./catalog";

test("cobra R$ 11,90 a cada 600 Robux e soma a entrega expressa uma vez", () => {
  const quote = quoteCheckout(
    [
      { sku: "r600", quantity: 1 },
      { sku: "r1200", quantity: 1 },
    ],
    true,
  );

  assert.equal(quote.amountCents, CENTS_PER_STEP + CENTS_PER_STEP * 2 + EXPRESS_DELIVERY_CENTS);
  assert.equal(quote.description, "Pedido Stellar Bux");
  assert.equal(quote.lines.length, 2);
});

test("os pacotes sobem de 600 em 600 Robux", () => {
  assert.equal(quoteCheckout([{ sku: "r600", quantity: 1 }]).amountCents, 1190);
  assert.equal(quoteCheckout([{ sku: "r1200", quantity: 1 }]).amountCents, 2380);
  assert.equal(quoteCheckout([{ sku: "r1800", quantity: 1 }]).amountCents, 3570);
  assert.equal(quoteCheckout([{ sku: "r2400", quantity: 1 }]).amountCents, 4760);
});

test("rejeita quantidade que não é múltiplo de 600", () => {
  assert.throws(() => quoteCheckout([{ sku: "r1000", quantity: 1 }]), /SKU desconhecido/);
});
