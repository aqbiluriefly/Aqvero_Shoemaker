"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Client cart. Persisted to localStorage so it survives closing the browser.
 * It stores only identifiers and quantities — never prices. Prices, stock and
 * totals are always recalculated on the server (Stage 3 / Stage 4).
 */

export type CartLine = {
  sku: string;
  productSlug: string;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
};

export const MAX_QTY_PER_LINE = 10;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addItem: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.sku === line.sku);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.sku === line.sku ? { ...l, quantity: Math.min(MAX_QTY_PER_LINE, l.quantity + quantity) } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity: Math.min(MAX_QTY_PER_LINE, quantity) }] };
        }),
      setQuantity: (sku, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.sku !== sku)
              : state.lines.map((l) => (l.sku === sku ? { ...l, quantity: Math.min(MAX_QTY_PER_LINE, quantity) } : l)),
        })),
      removeItem: (sku) => set((state) => ({ lines: state.lines.filter((l) => l.sku !== sku) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "aqvero-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useCartCount(): number {
  return useCart((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
}
