"use client";

import { normalizeOrder, type StoreOrder } from "./orders";

function storageKey(id: string) {
  return `stellar-order:${id}`;
}

export function saveOrder(order: StoreOrder) {
  try {
    const normalized = normalizeOrder(order);
  const payload = normalized.pix ? { ...normalized, pix: { ...normalized.pix, qrCodeImage: normalized.pix.qrCodeImage } } : normalized;
    sessionStorage.setItem(storageKey(order.id), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export async function fetchOrder(id: string): Promise<StoreOrder | null> {
  try {
    const response = await fetch("/api/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ id, order: loadOrder(id) }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { order?: StoreOrder };
    return body.order ? normalizeOrder(body.order) : null;
  } catch {
    return null;
  }
}

export function loadOrder(id: string): StoreOrder | null {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreOrder;
    if (!parsed || typeof parsed.id !== "string" || !Array.isArray(parsed.lines)) return null;
    return normalizeOrder(parsed);
  } catch {
    return null;
  }
}