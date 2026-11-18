"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/catalog/types";
import { cn } from "@/lib/format";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return (
      <div className="aspect-[4/5]">
        <ProductImagePlaceholder />
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <div className="flex gap-2 md:flex-col" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn("relative h-20 w-16 shrink-0 overflow-hidden bg-cream ring-1 transition", i === active ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100")}
            >
              <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-cream md:aspect-[6/5]">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority
          style={{ objectPosition: current.focus }}
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="animate-fade-up object-cover"
        />
      </div>
    </div>
  );
}
