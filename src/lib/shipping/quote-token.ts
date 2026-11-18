import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShippingRate } from "./types";

/**
 * Signed shipping quotes.
 * When we show a rate, the server signs {rate, destination, cart} with a
 * secret. At checkout the browser sends back only the token; the server
 * verifies the signature, expiry and that the cart/address still match.
 * The browser therefore cannot change a shipping price.
 * (Stage 4 additionally stores quotes in the `shipping_quotes` table.)
 */

const TTL_MS = 30 * 60 * 1000;

export type QuotePayload = {
  v: 1;
  rate: ShippingRate;
  dest: string;
  cart: string;
  exp: number;
};

function secret(): string {
  const s = process.env.SHIPPING_QUOTE_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SHIPPING_QUOTE_SECRET is missing or too short (min 32 chars). See .env.example.");
  }
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function destinationKey(d: { country: string; postalCode: string; city: string }): string {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
  return [norm(d.country), norm(d.postalCode).replace(/\s/g, ""), norm(d.city)].join("|");
}

export function createQuoteToken(rate: ShippingRate, dest: string, cart: string): string {
  const payload: QuotePayload = { v: 1, rate, dest, cart, exp: Date.now() + TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export type VerifyResult = { ok: true; payload: QuotePayload } | { ok: false; reason: string };

export function verifyQuoteToken(token: string, expected: { dest: string; cart: string }): VerifyResult {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, reason: "Invalid shipping quote." };
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "Invalid shipping quote." };

  let payload: QuotePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "Invalid shipping quote." };
  }
  if (payload.v !== 1) return { ok: false, reason: "Invalid shipping quote." };
  if (Date.now() > payload.exp) return { ok: false, reason: "Your shipping quote expired. Please recalculate shipping." };
  if (payload.dest !== expected.dest) return { ok: false, reason: "Your address changed. Please recalculate shipping." };
  if (payload.cart !== expected.cart) return { ok: false, reason: "Your cart changed. Please recalculate shipping." };
  return { ok: true, payload };
}
