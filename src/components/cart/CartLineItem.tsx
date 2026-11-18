"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import type { PricedLine } from "@/lib/cart/server";
import { useCart } from "@/stores/cart";
import { formatUsd } from "@/lib/format";

export function CartLineItem({ line, compact = false, onNavigate }: { line: PricedLine; compact?: boolean; onNavigate?: () => void }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);

  return (
    <li className="flex gap-4 py-5">
      <Link href={`/products/${line.productSlug}`} onClick={onNavigate} className={`relative shrink-0 overflow-hidden bg-cream ${compact ? "h-24 w-20" : "h-32 w-28"}`}>
        {line.image && (
          <Image src={line.image} alt={line.name} fill sizes="112px" className="object-cover" style={{ objectPosition: line.imageFocus }} />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${line.productSlug}`} onClick={onNavigate} className="font-serif text-lg leading-tight hover:underline">
              {line.name}
            </Link>
            <p className="mt-1 text-[12px] leading-relaxed text-stone">
              {line.colorName} · {line.sizeLabel}
              {line.optionLabels.map((o) => (
                <span key={o} className="block">{o}</span>
              ))}
              {line.isMadeToOrder && line.productionWeeks && (
                <span className="block">Made to order · {line.productionWeeks[0]}–{line.productionWeeks[1]} weeks</span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => removeItem(line.lineId)} aria-label={`Remove ${line.name}`} className="-mr-1 p-1 text-stone hover:text-ink">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex h-9 items-center border border-sand">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity(line.lineId, line.quantity - 1)}
              className="flex h-full w-9 items-center justify-center hover:bg-cream"
            >
              <Minus size={14} strokeWidth={1.5} />
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">{line.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={line.quantity >= line.maxQuantity}
              onClick={() => setQuantity(line.lineId, line.quantity + 1)}
              className="flex h-full w-9 items-center justify-center hover:bg-cream disabled:opacity-30"
            >
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm">{formatUsd(line.lineTotalCents)}</p>
            {line.quantity > 1 && <p className="text-[11px] text-stone">{formatUsd(line.unitPriceCents)} each</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
