import { NextResponse } from "next/server";
import { z } from "zod";
import { priceCart } from "@/lib/cart/server";
import { cartLineSchema } from "@/lib/validation/checkout";
import { jsonError, limited, readJson } from "@/lib/api";

const bodySchema = z.object({ lines: z.array(cartLineSchema).max(30) });

/** Returns server-calculated prices for the browser's cart. */
export async function POST(request: Request) {
  if (limited(request, "cart-price", 120)) return jsonError(429, "Too many requests. Please slow down.");
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "Invalid cart.");
  return NextResponse.json({ ok: true, cart: priceCart(parsed.data.lines) });
}
