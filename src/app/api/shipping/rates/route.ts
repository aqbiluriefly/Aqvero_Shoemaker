import { NextResponse } from "next/server";
import { z } from "zod";
import { shippingConfig } from "@/config/shipping";
import { cartFingerprint, priceCart } from "@/lib/cart/server";
import { buildPackages } from "@/lib/shipping/packaging";
import { getShippingProviders } from "@/lib/shipping";
import { createQuoteToken, destinationKey } from "@/lib/shipping/quote-token";
import type { ShippingRate } from "@/lib/shipping/types";
import { cartLinesSchema, destinationSchema } from "@/lib/validation/checkout";
import { isValidPostalCode } from "@/lib/geo/countries";
import { jsonError, limited, readJson } from "@/lib/api";

const bodySchema = z.object({
  lines: cartLinesSchema,
  destination: destinationSchema,
  /** "estimate" (cart page: country only, no token) or "quote" (checkout: full address, signed token). */
  mode: z.enum(["estimate", "quote"]).default("quote"),
});

export async function POST(request: Request) {
  if (limited(request, "shipping-rates", 30)) return jsonError(429, "Too many requests. Please wait a moment.");

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  const { lines, destination, mode } = parsed.data;

  if (mode === "quote") {
    if (!destination.city) return jsonError(400, "Please enter your city.");
    if (!isValidPostalCode(destination.country, destination.postalCode)) {
      return jsonError(400, "Please enter a valid postal code.");
    }
  }

  const cart = priceCart(lines);
  if (cart.lines.length === 0) return jsonError(400, "Your cart has no purchasable items.");

  const providers = getShippingProviders();
  if (providers.length === 0) return jsonError(503, "Shipping is temporarily unavailable.");

  const results = await Promise.allSettled(
    providers.map((p) =>
      p.getRates({
        origin: shippingConfig.origin,
        destination: {
          countryCode: destination.country,
          postalCode: destination.postalCode,
          city: destination.city,
          state: destination.state,
        },
        packages: buildPackages(cart.lines),
        declaredValueCents: cart.subtotalCents,
      }),
    ),
  );

  const rates: ShippingRate[] = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => a.amountCents - b.amountCents);

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[shipping] ${providers[i].id} failed:`, r.reason);
  });

  if (rates.length === 0) return jsonError(502, "We couldn't get shipping rates for this address. Please check it or contact us.");

  const dest = destinationKey(destination);
  const fingerprint = cartFingerprint(cart);

  return NextResponse.json({
    ok: true,
    packages: buildPackages(cart.lines).length,
    weightKg: cart.totalWeightKg,
    rates: rates.map((rate) => ({
      ...rate,
      token: mode === "quote" ? createQuoteToken(rate, dest, fingerprint) : undefined,
    })),
  });
}
