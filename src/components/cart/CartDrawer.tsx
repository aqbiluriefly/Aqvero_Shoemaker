"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useUi } from "@/stores/ui";
import { formatUsd, cn } from "@/lib/format";
import { usePricedCart } from "./usePricedCart";
import { CartLineItem } from "./CartLineItem";

export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const close = useUi((s) => s.closeCart);
  const pathname = usePathname();
  const { cart, loading, notices, error } = usePricedCart();

  // Close when navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) close();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const empty = cart && cart.lines.length === 0;

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={cn("fixed inset-0 z-[80] bg-black/35 transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[90] flex w-full max-w-md flex-col bg-paper transition-[transform,box-shadow] duration-500 ease-[var(--ease-soft)]",
          open ? "translate-x-0 shadow-2xl" : "translate-x-full shadow-none",
        )}
      >
        <div className="flex items-center justify-between border-b border-sand px-5 py-4">
          <p className="font-serif text-2xl">Your cart {cart && cart.totalQuantity > 0 && <span className="text-base text-stone">({cart.totalQuantity})</span>}</p>
          <button type="button" onClick={close} aria-label="Close cart" className="p-2">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {notices.map((n) => (
            <p key={n} className="mt-4 bg-cream px-3 py-2 text-[12px]">{n}</p>
          ))}
          {error && <p className="mt-4 text-[13px] text-red-700">{error}</p>}
          {empty ? (
            <div className="py-16 text-center">
              <p className="font-serif text-2xl">Your cart is empty</p>
              <Link href="/shop" onClick={close} className="btn btn-primary mt-8">Shop now</Link>
            </div>
          ) : (
            <ul className={cn("divide-y divide-sand transition-opacity", loading && "opacity-60")}>
              {cart?.lines.map((l) => <CartLineItem key={l.lineId} line={l} compact onNavigate={close} />)}
            </ul>
          )}
        </div>

        {cart && cart.lines.length > 0 && (
          <div className="border-t border-sand px-5 pt-4 pb-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatUsd(cart.subtotalCents)}</span>
            </div>
            <p className="mt-1 text-[12px] text-stone">Shipping calculated at checkout. Duties and taxes, if any, are paid on delivery.</p>
            <div className="mt-5 grid gap-2">
              <Link href="/checkout" onClick={close} className="btn btn-primary w-full">Checkout</Link>
              <Link href="/cart" onClick={close} className="btn btn-outline w-full">View cart</Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
