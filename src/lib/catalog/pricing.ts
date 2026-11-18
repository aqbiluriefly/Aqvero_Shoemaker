import type { Product } from "./types";

/** Selected option values, keyed by option group slug, e.g. { sole: "vibram" }. */
export type SelectedOptions = Record<string, string>;

/** Default selection = the first value of each option group. */
export function defaultOptions(product: Product): SelectedOptions {
  return Object.fromEntries(product.optionGroups.map((g) => [g.slug, g.values[0]?.slug ?? ""]));
}

/**
 * Validates a selection against the product and returns the unit price in cents,
 * or null if any option is missing/unknown. The SAME function is used by the
 * server when pricing the cart and checkout (Stage 3), so the browser can never
 * dictate a price.
 */
export function unitPriceCents(product: Product, selected: SelectedOptions): number | null {
  let price = product.priceUsdCents;
  for (const group of product.optionGroups) {
    const value = group.values.find((v) => v.slug === selected[group.slug]);
    if (!value) return null;
    price += value.priceDeltaCents;
  }
  return price;
}

/** Lowest possible price (for "From $X" on product cards). */
export function fromPriceCents(product: Product): number {
  return product.optionGroups.reduce(
    (sum, g) => sum + Math.min(...g.values.map((v) => v.priceDeltaCents)),
    product.priceUsdCents,
  );
}

export function hasPriceRange(product: Product): boolean {
  return product.optionGroups.some((g) => new Set(g.values.map((v) => v.priceDeltaCents)).size > 1);
}
