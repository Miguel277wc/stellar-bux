import assert from "node:assert/strict";
import test from "node:test";
import { CENTS_PER_STEP, EXPRESS_DELIVERY_CENTS, productBySku, quoteCheckout, startingPriceCents } from "./catalog";

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
});

test("mantém os preços das ofertas e o piso das contas", () => {
  assert.equal(productBySku("iheadless")?.amountCents, 2990);
  assert.equal(productBySku("igodhuman")?.amountCents, 990);
  assert.equal(startingPriceCents(0), 3990);
  assert.equal(productBySku("c20")?.amountCents, 2000);
});

test("rejeita Robux que não é múltiplo de 600", () => {
  assert.equal(productBySku("r400"), null);
  assert.throws(() => quoteCheckout([{ sku: "r1000", quantity: 1 }]), /SKU desconhecido/);
});
