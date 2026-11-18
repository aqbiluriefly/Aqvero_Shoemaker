import type { Category, Product, ProductVariant } from "./types";
import { SIZE_CHARTS } from "./sizes";

/**
 * Temporary in-code catalog for Stage 2.
 * In Stage 4 this file is replaced by Supabase queries (see ./repository.ts),
 * and products are managed from the admin dashboard.
 */

export const categories: Category[] = [
  {
    slug: "boots",
    name: "Boots",
    description: "Hand-lasted leather boots built for years of wear.",
  },
  // Categories below are used only by development sample products.
  { slug: "chelsea", name: "Chelsea Boots", description: "Elastic-sided pull-on boots." },
  { slug: "loafers", name: "Loafers", description: "Slip-on leather shoes." },
  { slug: "dress", name: "Dress Shoes", description: "Oxfords and derbies." },
];

function madeToOrderVariants(skuPrefix: string, colorSlug: string, sizes: number[]): ProductVariant[] {
  return sizes.map((us) => ({
    sku: `${skuPrefix}-${colorSlug.toUpperCase()}-${String(us).replace(".", "H")}`,
    colorSlug,
    sizeUs: us,
    stock: null,
  }));
}

const menSizes = SIZE_CHARTS.men.map((r) => r.us);

/* ------------------------------------------------------------------ */
/* Real products                                                       */
/* ------------------------------------------------------------------ */

const engineerBoot: Product = {
  id: "prod_engineer_boot",
  slug: "engineer-boot-black-pull-up",
  name: "The Engineer Boot",
  subtitle: '8" Boot · Black Pull-Up Cowhide',
  categorySlug: "boots",
  sizeSystem: "men",
  priceUsdCents: 31500,
  shortDescription:
    "An 8-inch engineer boot cut from black pull-up cowhide and made by hand to order in Indonesia.",
  description: [
    "The Engineer Boot is our take on a classic work silhouette: an 8-inch shaft, a buckled strap across the instep and a second buckle at the top for a secure, adjustable fit.",
    "Each pair is cut from pull-up cowhide — leather infused with oils and waxes, so it lightens where it flexes and develops a rich, individual patina over time.",
    "The boot is Goodyear welted: the upper, insole and sole are stitched to a leather welt, which makes the boot sturdy, water-resistant at the seam and fully resoleable when the sole wears down.",
    "Every pair is made to order by hand in our Indonesian workshop. Production begins after your payment is confirmed.",
  ],
  leather: {
    type: "Cowhide",
    finish: "Pull-up (oil & wax infused)",
    origin: "Handmade in Indonesia",
  },
  // Only confirmed facts. TODO (owner): add lining and heel height.
  specs: [
    { label: "Construction", value: "Goodyear welted (resoleable)" },
    { label: "Shaft height", value: "8 inches" },
    { label: "Leather", value: "Black pull-up cowhide" },
    { label: "Sole", value: "Vibram or Dr. Sole rubber — your choice" },
    { label: "Closure", value: "Pull-on with adjustable buckle straps" },
    { label: "Production", value: "Made to order, 3–4 weeks" },
    { label: "Shipping weight", value: "Approx. 3 kg per pair" },
  ],
  care: [
    "Wipe off dust and mud with a soft, slightly damp cloth.",
    "Let wet boots dry naturally, away from direct heat.",
    "Condition the leather every few months to keep it supple.",
    "Pull-up leather scuffs can often be buffed out with a clean cloth and gentle warmth from your hands.",
  ],
  colors: [{ slug: "black", name: "Black", hex: "#141210" }],
  variants: madeToOrderVariants("AQ-ENG8", "black", menSizes),
  optionGroups: [
    {
      slug: "sole",
      name: "Sole",
      values: [
        { slug: "dr-sole", name: "Dr. Sole", description: "Durable rubber lug sole", priceDeltaCents: 0 },
        { slug: "vibram", name: "Vibram", description: "Genuine Vibram rubber sole", priceDeltaCents: 2000 },
      ],
    },
  ],
  images: [
    {
      src: "/images/products/engineer-boot-black-lifestyle.webp",
      alt: "AQVERO Engineer Boot in black pull-up leather worn outdoors on a forest trail",
      width: 762,
      height: 645,
      colorSlug: "black",
      focus: "60% 88%",
      // ⚠️ THIRD-PARTY PHOTO — development placeholder only. Replace with your own
      // product photography before launch (see LAUNCH_CHECKLIST.md).
    },
  ],
  fulfillment: { type: "made_to_order", productionWeeksMin: 3, productionWeeksMax: 4 },
  shippingWeightKg: 3,
  customWomenAvailable: true,
  isBestSeller: false,
  isNewArrival: true,
  popularity: 100,
  createdAt: "2026-11-18",
};

/* ------------------------------------------------------------------ */
/* Development-only sample products (SHOW_SAMPLE_PRODUCTS=true)        */
/* They have no photos and are clearly labelled "Sample".              */
/* ------------------------------------------------------------------ */

function sample(
  partial: Pick<Product, "slug" | "name" | "subtitle" | "categorySlug" | "priceUsdCents" | "colors" | "popularity" | "createdAt"> &
    Partial<Product>,
): Product {
  const sizes = partial.sizeSystem === "women" ? SIZE_CHARTS.women.map((r) => r.us) : menSizes.slice(0, 9);
  return {
    id: `sample_${partial.slug}`,
    sizeSystem: "men",
    shortDescription: "Placeholder product for development and layout testing.",
    description: ["This is a sample product used only during development. It is not for sale."],
    leather: { type: "—", finish: "—", origin: "—" },
    specs: [{ label: "Status", value: "Development sample" }],
    care: [],
    optionGroups: [],
    variants: partial.colors.flatMap((c, i) =>
      sizes.map((us) => ({ sku: `SAMPLE-${partial.slug}-${c.slug}-${us}`, colorSlug: c.slug, sizeUs: us, stock: (us * 3 + i) % 4 })),
    ),
    images: [],
    fulfillment: { type: "in_stock", dispatchDays: 3 },
    shippingWeightKg: 2,
    customWomenAvailable: false,
    isBestSeller: false,
    isNewArrival: false,
    isSample: true,
    ...partial,
  };
}

const sampleProducts: Product[] = [
  sample({
    slug: "sample-chelsea-boot",
    name: "Sample Chelsea Boot",
    subtitle: "Development sample",
    categorySlug: "chelsea",
    priceUsdCents: 26500,
    colors: [
      { slug: "brown", name: "Brown", hex: "#6B4226" },
      { slug: "black", name: "Black", hex: "#141210" },
    ],
    popularity: 80,
    isBestSeller: true,
    createdAt: "2026-10-01",
  }),
  sample({
    slug: "sample-service-boot",
    name: "Sample Service Boot",
    subtitle: "Development sample",
    categorySlug: "boots",
    priceUsdCents: 28900,
    colors: [{ slug: "tan", name: "Tan", hex: "#A8713F" }],
    popularity: 60,
    isBestSeller: true,
    createdAt: "2026-09-01",
  }),
  sample({
    slug: "sample-penny-loafer",
    name: "Sample Penny Loafer",
    subtitle: "Development sample",
    categorySlug: "loafers",
    priceUsdCents: 19500,
    colors: [{ slug: "brown", name: "Brown", hex: "#6B4226" }],
    popularity: 40,
    isNewArrival: true,
    createdAt: "2026-11-10",
  }),
  sample({
    slug: "sample-derby",
    name: "Sample Derby",
    subtitle: "Development sample",
    categorySlug: "dress",
    priceUsdCents: 42500,
    colors: [
      { slug: "black", name: "Black", hex: "#141210" },
      { slug: "burgundy", name: "Burgundy", hex: "#5A1F24" },
    ],
    popularity: 20,
    createdAt: "2026-08-01",
  }),
];

export function getAllProductsRaw(): Product[] {
  const showSamples =
    process.env.SHOW_SAMPLE_PRODUCTS === "true" && process.env.VERCEL_ENV !== "production";
  return showSamples ? [engineerBoot, ...sampleProducts] : [engineerBoot];
}
