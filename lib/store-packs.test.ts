import assert from "node:assert/strict";
import test from "node:test";
import { quoteCheckout } from "./catalog";
import { STORE_PACKS, packCheckoutUrl } from "./store-packs";

test("cada pacote aponta para o checkout da Axxon", () => {
  for (const pack of STORE_PACKS) {
    const plain = quoteCheckout([{ sku: `r${pack.robux}`, quantity: 1 }], false);
    const express = quoteCheckout([{ sku: `r${pack.robux}`, quantity: 1 }], true);
    assert.ok(plain.amountCents >= 600);
    assert.ok(express.amountCents > plain.amountCents);
    assert.match(packCheckoutUrl(pack.robux, false), /^https:\/\/app\.axxonpay\.com\.br\/checkout\/link-/);
    assert.match(packCheckoutUrl(pack.robux, true), /^https:\/\/app\.axxonpay\.com\.br\/checkout\/link-/);
    assert.notEqual(pack.url, pack.expressUrl);
  }
});
