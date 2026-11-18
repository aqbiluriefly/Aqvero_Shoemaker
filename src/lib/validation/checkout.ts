import { z } from "zod";
import {
  isShippableCountry,
  isValidPostalCode,
  postalRequired,
  stateRequirement,
  STATES,
} from "@/lib/geo/countries";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    // Reject control characters (except normal whitespace).
    .refine((v) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v), "Contains invalid characters");

/* ------------------------------ Cart lines ------------------------------ */

export const cartLineSchema = z.object({
  sku: z.string().regex(/^[A-Za-z0-9-]{1,80}$/),
  productSlug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  options: z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.string().regex(/^[a-z0-9-]{1,40}$/)).default({}),
  quantity: z.number().int().min(1).max(10),
});

export const cartLinesSchema = z.array(cartLineSchema).min(1, "Your cart is empty").max(30);

export type CartLineInput = z.infer<typeof cartLineSchema>;

/* -------------------------------- Address -------------------------------- */

export const addressSchema = z
  .object({
    fullName: text(100).pipe(z.string().min(2, "Please enter your full name")),
    email: z.string().trim().toLowerCase().max(254).email("Please enter a valid email address"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s().-]{7,20}$/, "Please enter a valid phone number, including country code"),
    country: z.string().length(2).refine(isShippableCountry, "We can't ship to this country yet"),
    state: text(80).default(""),
    city: text(80).pipe(z.string().min(1, "Please enter your city")),
    address1: text(120).pipe(z.string().min(3, "Please enter your street address")),
    address2: text(120).default(""),
    postalCode: text(12).default(""),
    notes: text(500).default(""),
  })
  .superRefine((a, ctx) => {
    const req = stateRequirement(a.country);
    if (req === "select" && !STATES[a.country].some((s) => s.code === a.state)) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "Please select a state / province" });
    }
    if (req === "required" && a.state.length < 2) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "Please enter your state / province" });
    }
    if (postalRequired(a.country) && !a.postalCode) {
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Please enter your postal code" });
    } else if (!isValidPostalCode(a.country, a.postalCode)) {
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: "This postal code doesn't look right for the selected country" });
    }
  });

export type AddressInput = z.infer<typeof addressSchema>;

/** Minimal destination for rate quotes. */
export const destinationSchema = z.object({
  country: z.string().length(2).refine(isShippableCountry, "We can't ship to this country yet"),
  postalCode: z.string().trim().max(12).default(""),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(80).default(""),
});

export type DestinationInput = z.infer<typeof destinationSchema>;

/* ------------------------------- Checkout ------------------------------- */

export const checkoutSchema = z.object({
  lines: cartLinesSchema,
  address: addressSchema,
  shippingQuoteToken: z.string().min(10).max(4000),
  idempotencyKey: z.string().uuid(),
});

/** Turns Zod issues into { field: message } for the form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
