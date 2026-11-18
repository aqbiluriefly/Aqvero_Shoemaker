"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/stores/cart";
import { useHydrated } from "@/hooks";
import type { PricedCart } from "@/lib/cart/server";

type State = {
  cart: PricedCart | null;
  loading: boolean;
  error: string;
  notices: string[];
};

/**
 * Sends the local cart (IDs + quantities) to the server and returns the
 * server-priced cart. Lines the server rejects are removed locally with a notice.
 */
export function usePricedCart() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const removeItem = useCart((s) => s.removeItem);
  const setQuantity = useCart((s) => s.setQuantity);
  const [state, setState] = useState<State>({ cart: null, loading: true, error: "", notices: [] });
  const requestId = useRef(0);

  const key = JSON.stringify(lines.map((l) => [l.lineId, l.quantity]));

  useEffect(() => {
    if (!hydrated) return;
    const id = ++requestId.current;
    const currentLines = useCart.getState().lines;

    if (currentLines.length === 0) {
      setState({ cart: { lines: [], rejected: [], subtotalCents: 0, totalQuantity: 0, totalWeightKg: 0 }, loading: false, error: "", notices: [] });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: currentLines.map(({ sku, productSlug, options, quantity }) => ({ sku, productSlug, options, quantity })),
          }),
        });
        const data = await res.json();
        if (id !== requestId.current) return;
        if (!data.ok) throw new Error(data.message);
        const cart = data.cart as PricedCart;

        const notices: string[] = [];
        cart.rejected.forEach((r) => {
          removeItem(r.lineId);
          notices.push(r.reason);
        });
        // Clamp quantities the server reduced (e.g. limited stock).
        cart.lines.forEach((l) => {
          const local = currentLines.find((x) => x.lineId === l.lineId);
          if (local && local.quantity !== l.quantity) {
            setQuantity(l.lineId, l.quantity);
            notices.push(`Quantity for ${l.name} was adjusted to ${l.quantity}.`);
          }
        });
        setState({ cart, loading: false, error: "", notices });
      } catch (e) {
        if (id !== requestId.current) return;
        setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Could not load cart." }));
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hydrated, key, removeItem, setQuantity]);

  return { ...state, hydrated };
}
