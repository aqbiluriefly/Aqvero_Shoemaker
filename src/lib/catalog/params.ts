import type { ProductFilters, SortKey } from "./repository";

const SORT_KEYS: SortKey[] = ["popular", "newest", "price-asc", "price-desc"];
const SLUG_RE = /^[a-z0-9-]{1,60}$/;

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Parses and validates untrusted URL search params into catalog filters. */
export function parseShopParams(raw: RawParams): ProductFilters {
  const category = first(raw.category);
  const sort = first(raw.sort);
  const price = first(raw.price);
  const sizes = (first(raw.size) ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0 && n < 20);
  const colors = (first(raw.color) ?? "").split(",").filter((c) => SLUG_RE.test(c));

  return {
    category: category && SLUG_RE.test(category) ? category : undefined,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "popular",
    price: price && /^[0-9]+-([0-9]+|up)$/.test(price) ? price : undefined,
    sizes: sizes.slice(0, 20),
    colors: colors.slice(0, 20),
  };
}
