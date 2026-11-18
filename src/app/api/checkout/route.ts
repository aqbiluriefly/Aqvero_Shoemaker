import { NextResponse } from "next/server";
import { cartFingerprint, priceCart } from "@/lib/cart/server";
import { simulatedCheckoutAllowed } from "@/lib/shipping";
import { destinationKey, verifyQuoteToken } from "@/lib/shipping/quote-token";
import { checkoutSchema, fieldErrors } from "@/lib/validation/checkout";
import { jsonError, limited, readJson } from "@/lib/api";

/**
 * Validates a checkout and returns the server-calculated order summary.
 *
 * Stage 3: validation + totals only (nothing is stored or charged).
 * Stage 4: creates the order (status PENDING_PAYMENT) in Supabase, keyed by
 *          idempotencyKey so a double-click can never create two orders.
 * Stage 6: creates the payment session and redirects to the gateway.
 */
export async function POST(request: Request) {
  if (limited(request, "checkout", 10)) return jsonError(429, "Too many attempts. Please wait a minute and try again.");

  const parsed = checkoutSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(400, "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { lines, address, shippingQuoteToken, idempotencyKey } = parsed.data;

  const cart = priceCart(lines);
  if (cart.rejected.length > 0) {
    return jsonError(409, "Some items in your cart changed. Please review your cart.", { rejected: cart.rejected });
  }
  if (cart.lines.length === 0) return jsonError(400, "Your cart is empty.");

  const verified = verifyQuoteToken(shippingQuoteToken, {
    dest: destinationKey(address),
    cart: cartFingerprint(cart),
  });
  if (!verified.ok) return jsonError(409, verified.reason, { code: "SHIPPING_QUOTE_INVALID" });

  const shipping = verified.payload.rate;
  if (shipping.simulated && !simulatedCheckoutAllowed()) {
    return jsonError(503, "Live shipping rates are not available yet, so orders can't be placed. Please contact us.", {
      code: "SIMULATED_SHIPPING_BLOCKED",
    });
  }

  const totalCents = cart.subtotalCents + shipping.amountCents;

  return NextResponse.json({
    ok: true,
    stage: "validated",
    idempotencyKey,
    summary: {
      currency: "USD",
      lines: cart.lines.map((l) => ({
        name: l.name,
        sku: l.sku,
        colorName: l.colorName,
        sizeLabel: l.sizeLabel,
        optionLabels: l.optionLabels,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        lineTotalCents: l.lineTotalCents,
      })),
      subtotalCents: cart.subtotalCents,
      shipping: {
        serviceName: shipping.serviceName,
        amountCents: shipping.amountCents,
        transitDaysMin: shipping.transitDaysMin,
        transitDaysMax: shipping.transitDaysMax,
        simulated: shipping.simulated,
      },
      totalCents,
      shipTo: {
        fullName: address.fullName,
        email: address.email,
        country: address.country,
        city: address.city,
      },
    },
  });
}
