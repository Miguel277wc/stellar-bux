import assert from "node:assert/strict";
import test from "node:test";
import { EXPRESS_DELIVERY_CENTS, quoteCheckout } from "./catalog";

test("cobra R$ 7,90 a cada 1.000 Robux e soma a entrega expressa uma vez", () => {
  const quote = quoteCheckout(
    [
      { sku: "r1000", quantity: 1 },
      { sku: "r500", quantity: 2 },
    ],
    true,
  );

  assert.equal(quote.amountCents, 790 + 395 * 2 + EXPRESS_DELIVERY_CENTS);
  assert.equal(quote.description, "Pedido Stellar Bux");
  assert.equal(quote.lines.length, 2);
});

test("1.000 Robux sobe para o mínimo de R$ 10 do PIX", () => {
  assert.equal(quoteCheckout([{ sku: "r1000", quantity: 1 }]).amountCents, 1000);
  assert.equal(quoteCheckout([{ sku: "r2500", quantity: 1 }]).amountCents, 1975);
});

test("rejeita SKU que não é pacote de Robux", () => {
  assert.throws(() => quoteCheckout([{ sku: "caixa", quantity: 1 }]), /SKU desconhecido/);
});
