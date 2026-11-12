import assert from "node:assert/strict";
import test from "node:test";
import {
  ANTIFRAUD_FEE_CENTS,
  EXPRESS_DELIVERY_CENTS,
  quoteCheckout,
  quoteUpsell,
} from "./catalog";

test("cobra R$ 7,90 a cada 1.000 Robux e soma a entrega expressa uma vez", () => {
  const quote = quoteCheckout(
    [
      { sku: "r1000", quantity: 1 },
      { sku: "r500", quantity: 2 },
    ],
    true,
  );

  assert.equal(quote.amountCents, 790 + 395 * 2 + EXPRESS_DELIVERY_CENTS);
  assert.equal(quote.description, "Pedido Galaxy Bux");
  assert.equal(quote.lines.length, 2);
});

test("o upsell cobra só a taxa antifraude", () => {
  assert.equal(quoteUpsell().amountCents, ANTIFRAUD_FEE_CENTS);
});

test("rejeita SKU que não é pacote de Robux", () => {
  assert.throws(() => quoteCheckout([{ sku: "caixa", quantity: 1 }]), /SKU desconhecido/);
});
