"use client";

import Link from "next/link";
import { useState } from "react";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { ShippingEstimator } from "@/components/cart/ShippingEstimator";
import { usePricedCart } from "@/components/cart/usePricedCart";
import { formatUsd, cn } from "@/lib/format";

export default function CartPage() {
  const { cart, loading, error, notices, hydrated } = usePricedCart();
  const [shippingEstimate, setShippingEstimate] = useState<number | null>(null);

  return (
    <div className="container-x pt-10 md:pt-16">
      <h1 className="font-serif text-5xl md:text-6xl">Your Cart</h1>

      {notices.map((n) => (
        <p key={n} className="mt-6 bg-cream px-4 py-3 text-sm">{n}</p>
      ))}
      {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

      {!hydrated || !cart ? (
        <p className="mt-10 text-stone">Loading your cart…</p>
      ) : cart.lines.length === 0 ? (
        <div className="mt-10 border-t border-sand pt-10">
          <p className="text-stone">Your cart is empty.</p>
          <Link href="/shop" className="btn btn-primary mt-8">Shop now</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          <ul className={cn("divide-y divide-sand border-y border-sand transition-opacity", loading && "opacity-60")}>
            {cart.lines.map((l) => <CartLineItem key={l.lineId} line={l} />)}
          </ul>

          <aside className="h-fit bg-cream p-6 lg:sticky lg:top-28">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal ({cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"})</dt>
                <dd>{formatUsd(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="text-stone">{shippingEstimate != null ? `from ${formatUsd(shippingEstimate)}` : "At checkout"}</dd>
              </div>
              <div className="flex justify-between border-t border-sand pt-3 text-base">
                <dt>Estimated total</dt>
                <dd>{formatUsd(cart.subtotalCents + (shippingEstimate ?? 0))}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-stone">
              Prices in USD. Import duties and taxes, if any, are charged by your country on delivery.
            </p>

            <div className="mt-6 border-t border-sand pt-6">
              <ShippingEstimator onEstimate={setShippingEstimate} />
            </div>

            <Link href="/checkout" className="btn btn-primary mt-6 w-full">Checkout</Link>
            <Link href="/shop" className="mt-4 block text-center text-[13px] underline underline-offset-4">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
