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
  if (!name) {
    throw new AxxonPayError("Informe o usuário do Roblox.", 400);
  }

  return {
    name: payerName(name),
    email,
    phone: payerPhone(phone),
    document: payerDocument(document),
  };
}

export function payerPhone(phone: string): string {
  let digits = onlyDigits(phone);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) {
    throw new AxxonPayError("Informe um telefone com DDD, como 11999999999.", 400);
  }
  return digits;
}

export function payerName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ").filter((part) => part.length >= 2);
  if (parts.length < 2) {
    throw new AxxonPayError("Informe nome e sobrenome para gerar o PIX.", 400);
  }
  return parts.join(" ");
}

export function payerDocument(document: string): string {
  const digits = onlyDigits(document);
  if (digits.length !== 11 && digits.length !== 14) {
    throw new AxxonPayError(
      "Informe o CPF do cliente ou configure AXXONPAY_CUSTOMER_DOCUMENT no servidor.",
      400,
    );
  }
  const valid = digits.length === 11 ? isValidCpf(digits) : isValidCnpj(digits);
  if (!valid) {
    throw new AxxonPayError(digits.length === 11 ? "O CPF informado não é válido." : "O CNPJ informado não é válido.", 400);
  }
  return digits;
}

function checkDigit(nums: number[], weights: number[]): number {
  const sum = weights.reduce((total, weight, index) => total + nums[index] * weight, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function isValidCpf(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return false;
  const nums = digits.split("").map(Number);
  const first = checkDigit(nums, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(nums, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === nums[9] && second === nums[10];
}

function isValidCnpj(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return false;
  const nums = digits.split("").map(Number);
  const first = checkDigit(nums, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(nums, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === nums[12] && second === nums[13];
}
