"use client";

import Link from "next/link";
import { useCart } from "@/stores/cart";
import { useHydrated } from "@/hooks";

/**
 * TEMPORARY cart page (Stage 2). Replaced in Stage 3 by the full cart with
 * server-validated prices, quantity controls, shipping estimate and checkout.
 */
export default function CartPage() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const removeItem = useCart((s) => s.removeItem);

  return (
    <div className="container-x max-w-3xl pt-10 md:pt-16">
      <h1 className="font-serif text-5xl">Your Cart</h1>
      {!hydrated ? null : lines.length === 0 ? (
        <div className="mt-10">
          <p className="text-stone">Your cart is empty.</p>
          <Link href="/shop" className="btn btn-primary mt-8">Shop now</Link>
        </div>
      ) : (
        <>
          <ul className="mt-10 divide-y divide-sand border-y border-sand">
            {lines.map((l) => (
              <li key={l.sku} className="flex items-center justify-between py-4 text-sm">
                <span>
                  <Link href={`/products/${l.productSlug}`} className="underline underline-offset-4">{l.productSlug}</Link>
                  <span className="ml-3 text-stone">{l.sku} × {l.quantity}</span>
                </span>
                <button type="button" onClick={() => removeItem(l.sku)} className="text-stone underline">Remove</button>
              </li>
            ))}
          </ul>
          <p className="mt-6 bg-cream p-4 text-[13px] text-stone">
            Development preview: the full cart (prices, quantities, shipping estimate and checkout) is built in Stage 3.
          </p>
        </>
      )}
    </div>
  );
}
