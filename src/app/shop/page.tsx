import type { Metadata } from "next";
import { Suspense } from "react";
import { getCategory, getFacets, listProducts, SORT_OPTIONS } from "@/lib/catalog/repository";
import { parseShopParams } from "@/lib/catalog/params";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterPanel, MobileFilters, SortSelect } from "@/components/shop/ShopControls";

export const metadata: Metadata = {
  title: "Shop",
  description: "Handmade leather boots from Indonesia, made to order and shipped worldwide.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseShopParams(await searchParams);
  const [products, facets, category] = await Promise.all([
    listProducts(filters),
    getFacets(),
    filters.category ? getCategory(filters.category) : Promise.resolve(null),
  ]);

  return (
    <div className="container-x pt-10 md:pt-16">
      <header className="border-b border-sand pb-8">
        <p className="eyebrow text-stone">Shop</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">{category?.name ?? "All Products"}</h1>
        {category && <p className="mt-3 max-w-lg text-[15px] text-stone">{category.description}</p>}
      </header>

      <Suspense>
        <div className="flex items-center justify-between py-5">
          <p className="text-[13px] text-stone">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <div className="flex items-center gap-6">
            <MobileFilters facets={facets} />
            <SortSelect options={SORT_OPTIONS} />
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-28">
              <FilterPanel facets={facets} />
            </div>
          </aside>

          <section aria-label="Products">
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 xl:grid-cols-3">
                {products.map((p, i) => (
                  <ProductCard key={p.slug} product={p} priority={i < 3} />
                ))}
              </div>
            ) : (
              <div className="bg-cream px-6 py-20 text-center">
                <p className="font-serif text-3xl">No products match these filters</p>
                <p className="mt-3 text-sm text-stone">Try removing a filter or choosing another size.</p>
              </div>
            )}
          </section>
        </div>
      </Suspense>
    </div>
  );
}
