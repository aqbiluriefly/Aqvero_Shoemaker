"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Client cart. Persisted to localStorage so it survives closing the browser.
 * It stores only identifiers and quantities — never prices. Prices, stock and
 * totals are always recalculated on the server (Stage 3 / Stage 4).
 */

export type CartLine = {
  /** Unique per variant + option combination, e.g. "AQ-ENG8-BLACK-10|sole=vibram". */
  lineId: string;
  sku: string;
  productSlug: string;
  /** Selected options, e.g. { sole: "vibram" }. */
  options: Record<string, string>;
  quantity: number;
};

export function makeLineId(sku: string, options: Record<string, string>): string {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join(",");
  return opts ? `${sku}|${opts}` : sku;
}

type CartState = {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity" | "lineId">, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
};

export const MAX_QTY_PER_LINE = 10;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addItem: (input, quantity = 1) =>
        set((state) => {
          const line = { ...input, lineId: makeLineId(input.sku, input.options) };
          const existing = state.lines.find((l) => l.lineId === line.lineId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.lineId === line.lineId ? { ...l, quantity: Math.min(MAX_QTY_PER_LINE, l.quantity + quantity) } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity: Math.min(MAX_QTY_PER_LINE, quantity) }] };
        }),
      setQuantity: (lineId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.lineId !== lineId)
              : state.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.min(MAX_QTY_PER_LINE, quantity) } : l)),
        })),
      removeItem: (lineId) => set((state) => ({ lines: state.lines.filter((l) => l.lineId !== lineId) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "aqvero-cart",
      version: 2,
      // v1 lines had no options/lineId — drop them rather than guess.
      migrate: () => ({ lines: [] }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useCartCount(): number {
  return useCart((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
}
