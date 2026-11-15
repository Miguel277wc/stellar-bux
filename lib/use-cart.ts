"use client";

import { useMemo, useSyncExternalStore } from "react";

export type CartItem = { sku: string; quantity: number };

export type Cart = { items: CartItem[]; express: boolean };

export const CART_KEY = "stellar-bux-cart";

const EMPTY: Cart = { items: [], express: false };

function parseCart(raw: string): Cart {
  try {
    const value = JSON.parse(raw) as Cart;
    if (!value || !Array.isArray(value.items)) return EMPTY;
    return {
      items: value.items.filter((item) => item && typeof item.sku === "string" && Number.isInteger(item.quantity)),
      express: Boolean(value.express),
    };
  } catch {
    return EMPTY;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("stellar-cart", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("stellar-cart", onStoreChange);
  };
}

export function saveCart(cart: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("stellar-cart"));
}

export function useCart() {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(CART_KEY) || "",
    () => "",
  );
  const cart = useMemo(() => parseCart(raw), [raw]);

  function update(next: Cart) {
    saveCart(next);
  }

  return { cart, update };
}
