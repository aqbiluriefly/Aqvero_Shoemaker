"use client";

import { useMemo, useState } from "react";
import { Check, Ruler } from "lucide-react";
import type { Product } from "@/lib/catalog/types";
import { findSizeRow, formatSize, SIZE_LABEL_SYSTEMS, type SizeLabelSystem } from "@/lib/catalog/sizes";
import { useCart } from "@/stores/cart";
import { cn, formatUsd } from "@/lib/format";
import { defaultOptions, unitPriceCents } from "@/lib/catalog/pricing";
import { HowToMeasure, SizeGuideTable } from "./SizeGuideTable";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const [colorSlug, setColorSlug] = useState(product.colors[0]?.slug ?? "");
  const [sizeUs, setSizeUs] = useState<number | null>(null);
  const [labelSystem, setLabelSystem] = useState<SizeLabelSystem>("us");
  const [guideOpen, setGuideOpen] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>(() => defaultOptions(product));
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const addItem = useCart((s) => s.addItem);

  const variantsForColor = useMemo(
    () => product.variants.filter((v) => v.colorSlug === colorSlug).sort((a, b) => a.sizeUs - b.sizeUs),
    [product.variants, colorSlug],
  );
  const selected = variantsForColor.find((v) => v.sizeUs === sizeUs) ?? null;
  const color = product.colors.find((c) => c.slug === colorSlug);
  const isMto = product.fulfillment.type === "made_to_order";
  const price = unitPriceCents(product, options) ?? product.priceUsdCents;

  function stockText(): string {
    if (!selected) return "";
    if (selected.stock === null) return "Available to order";
    if (selected.stock === 0) return "Sold out";
    if (selected.stock <= 3) return `Only ${selected.stock} left`;
    return "In stock";
  }

  function handleAdd() {
    setError("");
    if (!selected) {
      setError("Please select a size.");
      return;
    }
    if (selected.stock === 0) {
      setError("This size is sold out.");
      return;
    }
    addItem({ sku: selected.sku, productSlug: product.slug, options }, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }

  const selectedRow = sizeUs ? findSizeRow(product.sizeSystem, sizeUs) : undefined;

  return (
    <div>
      <p className="mt-5 text-2xl" aria-live="polite">{formatUsd(price)}</p>
      <p className="mt-1 text-[12px] text-stone">
        Price in USD. Shipping calculated at checkout. Import duties and taxes may be charged by your country on delivery.
      </p>
      <p className="mt-6 text-[15px] leading-relaxed">{product.shortDescription}</p>

      {/* Option groups (e.g. sole) */}
      {product.optionGroups.map((group) => (
        <fieldset key={group.slug} className="mt-8">
          <legend className="eyebrow">{group.name}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {group.values.map((v) => {
              const on = options[group.slug] === v.slug;
              return (
                <label
                  key={v.slug}
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-3 border px-4 py-3 transition-colors",
                    on ? "border-ink" : "border-sand hover:border-stone",
                  )}
                >
                  <input
                    type="radio"
                    name={`option-${group.slug}`}
                    value={v.slug}
                    checked={on}
                    onChange={() => setOptions((o) => ({ ...o, [group.slug]: v.slug }))}
                    className="sr-only"
                  />
                  <span>
                    <span className="block text-sm font-medium">{v.name}</span>
                    {v.description && <span className="mt-0.5 block text-[12px] text-stone">{v.description}</span>}
                  </span>
                  <span className="shrink-0 text-[13px] text-stone">
                    {v.priceDeltaCents > 0 ? `+${formatUsd(v.priceDeltaCents)}` : "Included"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Colour */}
      <div className="mt-8">
        <p className="text-[13px]">
          <span className="eyebrow">Colour</span> <span className="ml-2 text-stone">{color?.name}</span>
        </p>
        <div className="mt-3 flex gap-3">
          {product.colors.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-label={c.name}
              aria-pressed={c.slug === colorSlug}
              onClick={() => {
                setColorSlug(c.slug);
                setSizeUs(null);
              }}
              className={cn("h-9 w-9 rounded-full ring-1 ring-offset-[3px] transition", c.slug === colorSlug ? "ring-ink" : "ring-sand hover:ring-stone")}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">Size</p>
          <div className="flex items-center gap-4">
            <div className="flex text-[11px]" role="group" aria-label="Size system">
              {SIZE_LABEL_SYSTEMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={labelSystem === s}
                  onClick={() => setLabelSystem(s)}
                  className={cn("px-2 py-1 uppercase tracking-wider", labelSystem === s ? "bg-ink text-paper" : "text-stone hover:text-ink")}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen} className="flex items-center gap-1.5 text-[13px] underline underline-offset-4">
              <Ruler size={14} strokeWidth={1.5} /> Size guide
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {variantsForColor.map((v) => {
            const row = findSizeRow(product.sizeSystem, v.sizeUs);
            const label = row ? formatSize(row[labelSystem], labelSystem).replace(/^(US|UK|EU) /, "") : String(v.sizeUs);
            const soldOut = v.stock === 0;
            return (
              <button
                key={v.sku}
                type="button"
                disabled={soldOut}
                aria-pressed={sizeUs === v.sizeUs}
                onClick={() => {
                  setSizeUs(v.sizeUs);
                  setError("");
                }}
                className={cn(
                  "h-11 border text-[13px] transition-colors",
                  sizeUs === v.sizeUs ? "border-ink bg-ink text-paper" : "border-sand hover:border-ink",
                  soldOut && "cursor-not-allowed text-stone/50 line-through hover:border-sand",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {selectedRow && (
          <p className="mt-3 text-[13px] text-stone">
            Selected: US {selectedRow.us} · UK {selectedRow.uk} · EU {selectedRow.eu} · {selectedRow.cm.toFixed(1)} cm
          </p>
        )}

        {guideOpen && (
          <div className="mt-5 animate-fade-up border border-sand p-5">
            <p className="font-serif text-xl">{product.sizeSystem === "men" ? "Men's" : "Women's"} size guide</p>
            <div className="mt-4">
              <SizeGuideTable system={product.sizeSystem} highlightUs={sizeUs} />
            </div>
            <p className="eyebrow mt-6 mb-3">How to measure</p>
            <HowToMeasure />
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="mt-8 space-y-2 border-y border-sand py-5 text-[13px]">
        {isMto && product.fulfillment.type === "made_to_order" && (
          <p>
            <span className="font-medium">Made to order.</span>{" "}
            <span className="text-stone">
              Production takes {product.fulfillment.productionWeeksMin}–{product.fulfillment.productionWeeksMax} weeks after payment,
              plus international shipping time.
            </span>
          </p>
        )}
        {product.fulfillment.type === "in_stock" && (
          <p><span className="font-medium">Ready to ship.</span> <span className="text-stone">Dispatched within {product.fulfillment.dispatchDays} business days.</span></p>
        )}
        <p className="text-stone">{selected ? stockText() : "Select a size to see availability."}</p>
      </div>

      {/* Actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={handleAdd} disabled={product.isSample} className="btn btn-primary">
          {added ? (<><Check size={16} /> Added to cart</>) : "Add to cart"}
        </button>
        {/* Buy Now goes straight to checkout — enabled in Stage 3 when checkout exists. */}
        <button type="button" disabled className="btn btn-outline" title="Checkout is built in Stage 3">
          Buy now
        </button>
      </div>
      <p role="alert" className="mt-3 min-h-5 text-[13px] text-red-700">{error}</p>
      {product.isSample && <p className="text-[13px] text-cognac">Development sample — not for sale.</p>}
    </div>
  );
}
