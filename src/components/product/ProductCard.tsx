import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog/types";
import { formatUsd } from "@/lib/format";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [first, second] = product.images;
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {first ? (
          <>
            <Image
              src={first.src}
              alt={first.alt}
              fill
              priority={priority}
              style={{ objectPosition: first.focus }}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-soft)] group-hover:scale-[1.03]"
            />
            {second && (
              <Image
                src={second.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <ProductImagePlaceholder />
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 sm:top-3 sm:left-3 sm:gap-1.5">
          {product.isSample && <span className="eyebrow bg-cognac px-2 py-1 text-paper">Sample</span>}
          {product.isNewArrival && !product.isSample && <span className="eyebrow bg-paper px-2 py-1">New</span>}
          {product.fulfillment.type === "made_to_order" && (
            <span className="eyebrow bg-paper/90 px-2 py-1">Made to order</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1 sm:mt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h3 className="font-serif text-lg leading-tight sm:text-xl">{product.name}</h3>
          <p className="mt-1 text-[12px] text-stone sm:text-[13px]">{product.subtitle}</p>
        </div>
        <p className="shrink-0 text-sm">{formatUsd(product.priceUsdCents)}</p>
      </div>
      {product.colors.length > 1 && (
        <div className="mt-3 flex gap-1.5" aria-label={`${product.colors.length} colours`}>
          {product.colors.map((c) => (
            <span key={c.slug} title={c.name} className="h-3 w-3 rounded-full ring-1 ring-sand" style={{ background: c.hex }} />
          ))}
        </div>
      )}
    </Link>
  );
}
