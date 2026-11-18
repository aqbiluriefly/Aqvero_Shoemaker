import "server-only";
import { getAllProductsRaw } from "@/lib/catalog/data";
import { unitPriceCents } from "@/lib/catalog/pricing";
import { findSizeRow } from "@/lib/catalog/sizes";
import type { Product, ProductVariant } from "@/lib/catalog/types";
import type { CartLineInput } from "@/lib/validation/checkout";

export type PricedLine = {
  lineId: string;
  sku: string;
  productSlug: string;
  options: Record<string, string>;
  quantity: number;
  name: string;
  subtitle: string;
  image: string | null;
  imageFocus?: string;
  colorName: string;
  sizeLabel: string;
  optionLabels: string[];
  unitPriceCents: number;
  lineTotalCents: number;
  maxQuantity: number;
  weightKg: number;
  isMadeToOrder: boolean;
  productionWeeks?: [number, number];
};

export type PricedCart = {
  lines: PricedLine[];
  /** Lines that were dropped (product removed, sold out, invalid option...). */
  rejected: { lineId: string; reason: string }[];
  subtotalCents: number;
  totalQuantity: number;
  totalWeightKg: number;
};

export function lineIdOf(l: CartLineInput): string {
  const opts = Object.keys(l.options)
    .sort()
    .map((k) => `${k}=${l.options[k]}`)
    .join(",");
  return opts ? `${l.sku}|${opts}` : l.sku;
}

function maxQty(variant: ProductVariant): number {
  return variant.stock === null ? 10 : Math.min(10, variant.stock);
}

/**
 * The single source of truth for cart prices. Ignores anything the browser
 * claims about price; only SKU, options and quantity are taken from input.
 */
export function priceCart(input: CartLineInput[]): PricedCart {
  const products = getAllProductsRaw();
  const merged = new Map<string, CartLineInput>();
  for (const l of input) {
    const id = lineIdOf(l);
    const prev = merged.get(id);
    merged.set(id, prev ? { ...l, quantity: prev.quantity + l.quantity } : l);
  }

  const lines: PricedLine[] = [];
  const rejected: PricedCart["rejected"] = [];

  for (const [lineId, l] of merged) {
    const product: Product | undefined = products.find((p) => p.slug === l.productSlug);
    const variant = product?.variants.find((v) => v.sku === l.sku);
    if (!product || !variant) {
      rejected.push({ lineId, reason: "This item is no longer available." });
      continue;
    }
    if (product.isSample) {
      rejected.push({ lineId, reason: "Sample products cannot be purchased." });
      continue;
    }
    // Reject unknown option groups as well as missing ones.
    const knownGroups = new Set(product.optionGroups.map((g) => g.slug));
    if (Object.keys(l.options).some((k) => !knownGroups.has(k))) {
      rejected.push({ lineId, reason: "Invalid product option." });
      continue;
    }
    const unit = unitPriceCents(product, l.options);
    if (unit === null) {
      rejected.push({ lineId, reason: "Please choose all product options." });
      continue;
    }
    const limit = maxQty(variant);
    if (limit <= 0) {
      rejected.push({ lineId, reason: "This size is sold out." });
      continue;
    }
    const quantity = Math.min(l.quantity, limit);
    const color = product.colors.find((c) => c.slug === variant.colorSlug);
    const sizeRow = findSizeRow(product.sizeSystem, variant.sizeUs);
    const image = product.images.find((i) => i.colorSlug === variant.colorSlug) ?? product.images[0];

    lines.push({
      lineId,
      sku: variant.sku,
      productSlug: product.slug,
      options: l.options,
      quantity,
      name: product.name,
      subtitle: product.subtitle,
      image: image?.src ?? null,
      imageFocus: image?.focus,
      colorName: color?.name ?? variant.colorSlug,
      sizeLabel: sizeRow
        ? `US ${sizeRow.us} / UK ${sizeRow.uk} / EU ${sizeRow.eu}`
        : `US ${variant.sizeUs}`,
      optionLabels: product.optionGroups.map((g) => {
        const v = g.values.find((x) => x.slug === l.options[g.slug]);
        return `${g.name}: ${v?.name ?? "—"}`;
      }),
      unitPriceCents: unit,
      lineTotalCents: unit * quantity,
      maxQuantity: limit,
      weightKg: product.shippingWeightKg,
      isMadeToOrder: product.fulfillment.type === "made_to_order",
      productionWeeks:
        product.fulfillment.type === "made_to_order"
          ? [product.fulfillment.productionWeeksMin, product.fulfillment.productionWeeksMax]
          : undefined,
    });
  }

  return {
    lines,
    rejected,
    subtotalCents: lines.reduce((s, l) => s + l.lineTotalCents, 0),
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    totalWeightKg: Math.round(lines.reduce((s, l) => s + l.weightKg * l.quantity, 0) * 100) / 100,
  };
}

/** Stable fingerprint of what is being shipped (used to bind shipping quotes to a cart). */
export function cartFingerprint(cart: PricedCart): string {
  return cart.lines
    .map((l) => `${l.sku}x${l.quantity}`)
    .sort()
    .join(";");
}
