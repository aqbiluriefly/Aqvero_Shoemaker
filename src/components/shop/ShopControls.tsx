"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/format";

type Facets = {
  categories: { slug: string; name: string; productCount: number }[];
  sizes: number[];
  colors: { slug: string; name: string; hex: string }[];
  priceRanges: { value: string; label: string }[];
};

type SortOption = { value: string; label: string };

function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggleInList(key: string, value: string) {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const nextList = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update(key, nextList.join(","));
  }

  function clearAll() {
    const sort = params.get("sort");
    startTransition(() => router.replace(sort ? `${pathname}?sort=${sort}` : pathname, { scroll: false }));
  }

  return { params, update, toggleInList, clearAll, pending };
}

export function SortSelect({ options }: { options: SortOption[] }) {
  const { params, update } = useParamUpdater();
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-stone">Sort</span>
      <select
        value={params.get("sort") ?? "popular"}
        onChange={(e) => update("sort", e.target.value === "popular" ? null : e.target.value)}
        className="cursor-pointer border-b border-ink bg-transparent py-1 pr-1 outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function FilterPanel({ facets }: { facets: Facets }) {
  const { params, update, toggleInList, clearAll, pending } = useParamUpdater();
  const activeCategory = params.get("category");
  const activeSizes = (params.get("size") ?? "").split(",").filter(Boolean);
  const activeColors = (params.get("color") ?? "").split(",").filter(Boolean);
  const activePrice = params.get("price");
  const hasFilters = Boolean(activeCategory || activeSizes.length || activeColors.length || activePrice);

  return (
    <div className={cn("space-y-9 transition-opacity", pending && "opacity-60")}>
      {facets.categories.length > 0 && (
        <FilterGroup title="Category">
          <ul className="space-y-2.5 text-sm">
            <li>
              <button type="button" onClick={() => update("category", null)} className={cn("link-underline", !activeCategory && "font-medium")}>
                All
              </button>
            </li>
            {facets.categories.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  aria-pressed={activeCategory === c.slug}
                  onClick={() => update("category", activeCategory === c.slug ? null : c.slug)}
                  className={cn("link-underline", activeCategory === c.slug && "font-medium")}
                >
                  {c.name} <span className="text-stone">({c.productCount})</span>
                </button>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Size (US)">
        <div className="grid grid-cols-4 gap-1.5">
          {facets.sizes.map((s) => {
            const on = activeSizes.includes(String(s));
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleInList("size", String(s))}
                className={cn(
                  "h-10 border text-[13px] transition-colors",
                  on ? "border-ink bg-ink text-paper" : "border-sand hover:border-ink",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <ul className="space-y-2.5 text-sm">
          {facets.priceRanges.map((r) => (
            <li key={r.value}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="price"
                  checked={activePrice === r.value}
                  onChange={() => update("price", r.value)}
                  className="accent-ink"
                />
                {r.label}
              </label>
            </li>
          ))}
          {activePrice && (
            <li>
              <button type="button" onClick={() => update("price", null)} className="text-xs text-stone underline">
                Any price
              </button>
            </li>
          )}
        </ul>
      </FilterGroup>

      <FilterGroup title="Colour">
        <ul className="space-y-2.5 text-sm">
          {facets.colors.map((c) => {
            const on = activeColors.includes(c.slug);
            return (
              <li key={c.slug}>
                <button type="button" aria-pressed={on} onClick={() => toggleInList("color", c.slug)} className="flex items-center gap-3">
                  <span
                    className={cn("h-5 w-5 rounded-full ring-1 ring-offset-2 transition", on ? "ring-ink" : "ring-sand")}
                    style={{ background: c.hex }}
                  />
                  <span className={cn(on && "font-medium")}>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      {hasFilters && (
        <button type="button" onClick={clearAll} className="btn btn-outline w-full">
          Clear filters
        </button>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-4">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Mobile: filters slide up in a bottom sheet. */
export function MobileFilters({ facets }: { facets: Facets }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-[13px] lg:hidden">
        <SlidersHorizontal size={16} strokeWidth={1.5} /> Filters
      </button>
      <div
        className={cn("fixed inset-0 z-[60] bg-black/40 transition-opacity lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto bg-paper px-5 pt-5 pb-8 transition-transform duration-500 ease-[var(--ease-soft)] lg:hidden",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="font-serif text-2xl">Filters</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="p-2">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <FilterPanel facets={facets} />
        <button type="button" onClick={() => setOpen(false)} className="btn btn-primary mt-8 w-full">
          Show results
        </button>
      </div>
    </>
  );
}
