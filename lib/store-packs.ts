export type StorePack = {
  robux: number;
  url: string;
  expressUrl: string;
};

export const STORE_PACKS: StorePack[] = [
  {
    robux: 1000,
    url: "https://app.axxonpay.com.br/checkout/link-M6_m2htLtR",
    expressUrl: "https://app.axxonpay.com.br/checkout/link-PYM8WS9pqo",
  },
  {
    robux: 2500,
    url: "https://app.axxonpay.com.br/checkout/link-gtTZKybjfL",
    expressUrl: "https://app.axxonpay.com.br/checkout/link-FlVf2ssnDh",
  },
  {
    robux: 5000,
    url: "https://app.axxonpay.com.br/checkout/link-b-9GSCjDE1",
    expressUrl: "https://app.axxonpay.com.br/checkout/link-89kF6DPlwq",
  },
  {
    robux: 10000,
    url: "https://app.axxonpay.com.br/checkout/link-qa231f3ewA",
    expressUrl: "https://app.axxonpay.com.br/checkout/link-OTn5XOgJ9m",
  },
];

export function packCheckoutUrl(robux: number, express: boolean): string {
  const pack = STORE_PACKS.find((item) => item.robux === robux);
  if (!pack) throw new Error("Pacote desconhecido.");
  return express ? pack.expressUrl : pack.url;
}
