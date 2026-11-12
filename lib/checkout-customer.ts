import { AxxonPayError, onlyDigits, type PixCustomer } from "./axxonpay";

export type CheckoutCustomerInput = {
  email?: string;
  phone?: string;
  roblox_username?: string;
  name?: string;
  document?: string;
};

export function pixCustomerFromInput(
  input: CheckoutCustomerInput,
  env: Record<string, string | undefined> = process.env,
): PixCustomer {
  const email = input.email?.trim() ?? "";
  const phone = onlyDigits(input.phone ?? "");
  const document = onlyDigits(input.document?.trim() || env.AXXONPAY_CUSTOMER_DOCUMENT || "");
  const name =
    input.name?.trim() ||
    input.roblox_username?.trim() ||
    env.AXXONPAY_CUSTOMER_NAME?.trim() ||
    "";

  if (!email.includes("@")) {
    throw new AxxonPayError("Informe um e-mail válido.", 400);
  }
  if (phone.length < 10) {
    throw new AxxonPayError("Informe um telefone com DDD.", 400);
  }
  if (!name) {
    throw new AxxonPayError("Informe o usuário do Roblox.", 400);
  }
  if (document.length !== 11 && document.length !== 14) {
    throw new AxxonPayError(
      "Informe o CPF do cliente ou configure AXXONPAY_CUSTOMER_DOCUMENT no servidor.",
      400,
    );
  }

  return { name, email, phone, document };
}
