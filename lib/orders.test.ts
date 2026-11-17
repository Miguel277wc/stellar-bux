import assert from "node:assert/strict";
import test from "node:test";
import { ANTIFRAUD_FEE_CENTS } from "./catalog";
import { attachTaxPix, createOrder, getStoredOrder, putOrder } from "./orders";

const customer = {
  name: "Ana Silva",
  email: "ana@email.com",
  phone: "11988887777",
  document: "08852175350",
  roblox_username: "Stellar_01",
};

test("cria o pedido principal e depois anexa o PIX da taxa", () => {
  createOrder({
    id: "SB-TEST-1",
    quote: {
      amountCents: 1190,
      description: "Pedido",
      express: false,
      lines: [{ sku: "r600", quantity: 1, amountCents: 1190, name: "600 Robux" }],
    },
    customer,
    fastDelivery: false,
    principalPixId: "FLE-PRINCIPAL",
    pix: {
      id: "FLE-PRINCIPAL",
      amountCents: 1190,
      copyPaste: "000201",
      qrCodeImage: "data:image/png;base64,abc",
    },
  });

  assert.equal(attachTaxPix("SB-TEST-1", { id: "FLE-TAX", amountCents: ANTIFRAUD_FEE_CENTS, copyPaste: "1", qrCodeImage: "x" }, "FLE-TAX"), null);

  const stored = getStoredOrder("SB-TEST-1");
  assert.ok(stored);
  putOrder({
    ...stored,
    phase: "taxa",
    principalPaid: true,
    pix: undefined,
  });

  const withTax = attachTaxPix(
    "SB-TEST-1",
    {
      id: "FLE-TAX",
      amountCents: ANTIFRAUD_FEE_CENTS,
      copyPaste: "000202",
      qrCodeImage: "data:image/png;base64,def",
    },
    "FLE-TAX",
  );
  assert.ok(withTax);
  assert.equal(withTax?.pix?.amountCents, ANTIFRAUD_FEE_CENTS);
});