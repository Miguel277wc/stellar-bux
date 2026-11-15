export const ROBUX_STEP = 600;
export const CENTS_PER_STEP = 1190;
export const EXPRESS_DELIVERY_CENTS = 1290;
export const MIN_PIX_CENTS = 1000;
export const MAX_ROBUX = 1_000_000;
export const MAX_QTY = 20;
export const PIX_DESCRIPTION = "Pedido Stellar Bux";

export const ROBUX_PACKS = [600, 1200, 1800, 2400, 3600, 6000, 12000, 30000, 60000, 120000] as const;

export const GAMES = [
  "Blox Fruits",
  "Adopt Me!",
  "Brookhaven RP",
  "Murder Mystery 2",
  "Tower of Hell",
  "Pet Simulator 99",
  "Grow a Garden",
  "Arsenal",
  "Jailbreak",
  "MeepCity",
  "Royale High",
  "Bee Swarm Simulator",
  "Doors",
  "Piggy",
  "Dress to Impress",
  "Phantom Forces",
  "Bad Business",
  "Anime Defenders",
  "King Legacy",
  "Your Bizarre Adventure",
  "Toilet Tower Defense",
  "Fisch",
  "Rivals",
  "Blade Ball",
  "Sol's RNG",
  "99 Nights in the Forest",
  "Steal a Brainrot",
  "Natural Disaster Survival",
  "Work at a Pizza Place",
  "Welcome to Bloxburg",
  "Build a Boat for Treasure",
  "Shindo Life",
  "Anime Adventures",
  "All Star Tower Defense",
  "Tower Defense Simulator",
  "Mad City",
  "Break In",
  "The Strongest Battlegrounds",
  "Slap Battles",
  "Bedwars",
  "Combat Warriors",
  "Da Hood",
  "Funky Friday",
  "Lumber Tycoon 2",
  "Theme Park Tycoon 2",
  "Legends of Speed",
  "Car Dealership Tycoon",
  "Dungeon Quest",
  "Livetopia",
  "Anime Last Stand",
  "Pls Donate",
  "Ninja Legends",
  "Steal an Egg",
] as const;

const ACCOUNT_TIERS = [
  { name: "Iniciante", base: 29.9 },
  { name: "Intermediária", base: 69.9 },
  { name: "Avançada", base: 149.9 },
  { name: "Premium", base: 299.9 },
  { name: "Elite", base: 499.9 },
] as const;

const GIFT_VALUES = [20, 50, 100, 200, 300, 500] as const;

const OFFERS = [
  { sku: "iheadless", name: "Headless Horseman", price: 29.9, compareAt: 461.9, description: "Cabeça limitada. Entrega na conta informada no pedido.", image: "/products/iheadless.png" },
  { sku: "ikorblox", name: "Korblox Deathspeaker", price: 19.9, compareAt: 253.3, description: "Perna limitada. Entrega na conta informada no pedido.", image: "/products/ikorblox.png" },
  { sku: "ikitsune", name: "Kitsune permanente", price: 11.9, compareAt: 149.9, description: "Fruta permanente no Blox Fruits, na conta do pedido.", image: "/products/ikitsune.png" },
  { sku: "idragon", name: "Dragon permanente", price: 12.9, compareAt: 129.9, description: "Fruta permanente no Blox Fruits, na conta do pedido.", image: "/products/idragon.png" },
  { sku: "ileopard", name: "Leopard permanente", price: 15.9, compareAt: 99.9, description: "Fruta permanente no Blox Fruits, na conta do pedido.", image: "/products/ileopard.png" },
  { sku: "igodhuman", name: "Godhuman", price: 9.9, compareAt: 89.9, description: "Estilo de luta no Blox Fruits, na conta do pedido.", image: "/products/igodhuman.png" },
] as const;

export type StoreKind = "robux" | "item" | "account" | "gift";

export type StoreProduct = {
  sku: string;
  name: string;
  amountCents: number;
  description: string;
  kind: StoreKind;
  compareAtCents?: number;
  image?: string;
  badge?: string;
  unique: boolean;
};

export type CheckoutItem = { sku: string; quantity: number };

export type QuoteLine = { sku: string; quantity: number; amountCents: number; name: string };

export type Quote = {
  amountCents: number;
  description: string;
  lines: QuoteLine[];
  express: boolean;
};

function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

function moneyReais(reais: number): number {
  return Math.round(reais * 100) / 100;
}

export function robuxCents(robux: number): number {
  if (!Number.isInteger(robux) || robux < ROBUX_STEP || robux > MAX_ROBUX || robux % ROBUX_STEP !== 0) {
    throw new Error(`SKU desconhecido: r${robux}`);
  }
  return Math.round((robux / ROBUX_STEP) * CENTS_PER_STEP);
}

export function accountPriceCents(gameIndex: number, base: number): number {
  const factor = gameIndex < 10 ? 1.4 : gameIndex < 25 ? 1.15 : 1;
  const stepped = 10 * Math.round((base * factor) / 10) - 0.1;
  const reais = stepped > 100 ? moneyReais(stepped / 2) : stepped;
  return reaisToCents(reais);
}

function offerProduct(offer: (typeof OFFERS)[number]): StoreProduct {
  return {
    sku: offer.sku,
    name: offer.name,
    amountCents: reaisToCents(offer.price),
    compareAtCents: reaisToCents(offer.compareAt),
    description: offer.description,
    kind: "item",
    image: offer.image,
    badge: "Item",
    unique: true,
  };
}

function giftProduct(value: number): StoreProduct {
  const robux = Math.round(value / (CENTS_PER_STEP / 100 / ROBUX_STEP));
  return {
    sku: `c${value}`,
    name: `Gift Card de ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    amountCents: value * 100,
    description: `≈ ${robux.toLocaleString("pt-BR")} Robux`,
    kind: "gift",
    image: "/products/gift-card.png",
    badge: "Gift Card",
    unique: false,
  };
}

function accountProduct(gameIndex: number, tierIndex: number): StoreProduct | null {
  const game = GAMES[gameIndex];
  const tier = ACCOUNT_TIERS[tierIndex];
  if (!game || !tier) return null;
  return {
    sku: `a${gameIndex}-${tierIndex + 1}`,
    name: `Conta ${game} · ${tier.name}`,
    amountCents: accountPriceCents(gameIndex, tier.base),
    description: `Conta ${tier.name} de ${game}. Entrega na conta informada no pedido.`,
    kind: "account",
    badge: tier.name,
    image: `/game-covers/${gameIndex}.png`,
    unique: true,
  };
}

export function productBySku(sku: string): StoreProduct | null {
  const robux = /^r(\d+)$/.exec(sku);
  if (robux) {
    const amount = Number(robux[1]);
    try {
      const cents = robuxCents(amount);
      return {
        sku: `r${amount}`,
        name: `${amount.toLocaleString("pt-BR")} Robux`,
        amountCents: cents,
        description: `${amount.toLocaleString("pt-BR")} Robux`,
        kind: "robux",
        image: "/products/robux.png",
        badge: "Pacote",
        unique: false,
      };
    } catch {
      return null;
    }
  }
  const gift = /^c(\d+)$/.exec(sku);
  if (gift) {
    const value = Number(gift[1]);
    return GIFT_VALUES.includes(value as (typeof GIFT_VALUES)[number]) ? giftProduct(value) : null;
  }
  const account = /^a(\d+)-([1-5])$/.exec(sku);
  if (account) return accountProduct(Number(account[1]), Number(account[2]) - 1);
  return OFFERS.map(offerProduct).find((item) => item.sku === sku) ?? null;
}

export const ITEM_OFFERS = OFFERS.map(offerProduct);
export const GIFT_CARDS = GIFT_VALUES.map(giftProduct);

export function accountsOf(gameIndex: number): StoreProduct[] {
  return ACCOUNT_TIERS.map((_, tierIndex) => accountProduct(gameIndex, tierIndex)).filter((item): item is StoreProduct => Boolean(item));
}

export function startingPriceCents(gameIndex: number): number {
  return accountsOf(gameIndex)[0]?.amountCents ?? 0;
}

export function quoteCheckout(items: CheckoutItem[], express = false): Quote {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("O pedido precisa de pelo menos um item.");
  }
  const lines = items.map((item) => {
    const product = productBySku(item.sku);
    if (!product) throw new Error(`SKU desconhecido: ${item.sku}`);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY || (product.unique && item.quantity !== 1)) {
      throw new Error(`Quantidade inválida para ${item.sku}.`);
    }
    return { sku: product.sku, quantity: item.quantity, amountCents: product.amountCents * item.quantity, name: product.name };
  });
  const products = lines.reduce((sum, line) => sum + line.amountCents, 0);
  return {
    amountCents: products + (express ? EXPRESS_DELIVERY_CENTS : 0),
    description: PIX_DESCRIPTION,
    lines,
    express,
  };
}
