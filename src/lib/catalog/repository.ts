import "server-only";
import { categories, getAllProductsRaw } from "./data";
import type { Category, Product } from "./types";

/**
 * Catalog repository — the ONLY place pages read product data from.
 * Stage 4 swaps these implementations for Supabase queries; pages stay unchanged.
 */

export type SortKey = "popular" | "newest" | "price-asc" | "price-desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export const PRICE_RANGES = [
  { value: "0-200", label: "Under $200", min: 0, max: 20000 },
  { value: "200-300", label: "$200 – $300", min: 20000, max: 30000 },
  { value: "300-400", label: "$300 – $400", min: 30000, max: 40000 },
  { value: "400-up", label: "$400 & above", min: 40000, max: Number.POSITIVE_INFINITY },
] as const;

export type ProductFilters = {
  category?: string;
  sizes?: number[];
  colors?: string[];
  price?: string;
  sort?: SortKey;
};

export async function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  let items = getAllProductsRaw();

  if (filters.category) items = items.filter((p) => p.categorySlug === filters.category);

  if (filters.sizes?.length) {
    const wanted = new Set(filters.sizes);
    items = items.filter((p) => p.variants.some((v) => wanted.has(v.sizeUs) && v.stock !== 0));
  }

  if (filters.colors?.length) {
    const wanted = new Set(filters.colors);
    items = items.filter((p) => p.colors.some((c) => wanted.has(c.slug)));
  }

  const range = PRICE_RANGES.find((r) => r.value === filters.price);
  if (range) items = items.filter((p) => p.priceUsdCents >= range.min && p.priceUsdCents < range.max);

  const sorted = [...items];
  switch (filters.sort ?? "popular") {
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "price-asc":
      sorted.sort((a, b) => a.priceUsdCents - b.priceUsdCents);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.priceUsdCents - a.priceUsdCents);
      break;
    default:
      sorted.sort((a, b) => b.popularity - a.popularity);
  }
  return sorted;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return getAllProductsRaw().find((p) => p.slug === slug) ?? null;
}

export async function listCategories(): Promise<(Category & { productCount: number })[]> {
  const products = getAllProductsRaw();
  return categories
    .map((c) => ({ ...c, productCount: products.filter((p) => p.categorySlug === c.slug).length }))
    .filter((c) => c.productCount > 0);
}

export async function getCategory(slug: string): Promise<Category | null> {
  return categories.find((c) => c.slug === slug) ?? null;
}

/** Facet values available across the whole catalog (for the filter sidebar). */
export async function getFacets() {
  const products = getAllProductsRaw();
  const sizes = Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.sizeUs)))).sort((a, b) => a - b);
  const colorMap = new Map<string, { slug: string; name: string; hex: string }>();
  products.forEach((p) => p.colors.forEach((c) => colorMap.set(c.slug, c)));
  return {
    categories: await listCategories(),
    sizes,
    colors: Array.from(colorMap.values()),
    priceRanges: PRICE_RANGES.map(({ value, label }) => ({ value, label })),
  };
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await listProducts({ sort: "popular" });
  const others = all.filter((p) => p.slug !== product.slug);
  const sameCategory = others.filter((p) => p.categorySlug === product.categorySlug);
  const rest = others.filter((p) => p.categorySlug !== product.categorySlug);
  return [...sameCategory, ...rest].slice(0, limit);
}

/** Minimal, client-safe product info used by the cart (no server-only data). */
export type CartProductSummary = {
  slug: string;
  name: string;
  priceUsdCents: number;
  image?: string;
};
