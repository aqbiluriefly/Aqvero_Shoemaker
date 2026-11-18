/**
 * Catalog domain types.
 * These mirror the Supabase tables planned for Stage 4 (products,
 * product_variants, product_images, categories) so the data source can be
 * swapped without touching the UI.
 */

export type SizeSystem = "men" | "women";

export type Category = {
  slug: string;
  name: string;
  description: string;
};

export type ProductColor = {
  slug: string;
  name: string;
  /** Swatch colour shown in the UI. */
  hex: string;
};

export type ProductImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Ties the photo to a colour so the gallery can switch with the swatch. */
  colorSlug?: string;
  /** CSS object-position, e.g. "50% 85%", to keep the shoe in frame when cropped. */
  focus?: string;
};

export type ProductVariant = {
  sku: string;
  colorSlug: string;
  /** Sizes are stored in US sizing; other systems are derived from the size chart. */
  sizeUs: number;
  /**
   * Units on hand. `null` means made to order (no fixed stock limit).
   */
  stock: number | null;
};

export type Fulfillment =
  | { type: "made_to_order"; productionWeeksMin: number; productionWeeksMax: number }
  | { type: "in_stock"; dispatchDays: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  categorySlug: string;
  sizeSystem: SizeSystem;
  /** Price in US cents (integer) to avoid floating-point errors. */
  priceUsdCents: number;
  shortDescription: string;
  description: string[];
  leather: { type: string; finish: string; origin: string };
  /** Short spec rows shown on the product page. Only confirmed facts. */
  specs: { label: string; value: string }[];
  care: string[];
  colors: ProductColor[];
  variants: ProductVariant[];
  images: ProductImage[];
  fulfillment: Fulfillment;
  /** Shipping weight per pair in kilograms (used by the shipping calculator in Stage 5). */
  shippingWeightKg: number;
  customWomenAvailable: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  /** Higher = more popular. Will be computed from orders once Supabase is connected. */
  popularity: number;
  createdAt: string;
  /** Development-only placeholder products. Never shown in production. */
  isSample?: boolean;
};
