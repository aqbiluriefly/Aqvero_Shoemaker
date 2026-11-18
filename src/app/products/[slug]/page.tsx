import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getCategory, getProductBySlug, getRelatedProducts } from "@/lib/catalog/repository";
import { formatUsd } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductCard } from "@/components/product/ProductCard";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${product.subtitle}`,
    description: product.shortDescription,
    openGraph: { images: product.images.slice(0, 1).map((i) => i.src) },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [category, related] = await Promise.all([getCategory(product.categorySlug), getRelatedProducts(product)]);

  // Structured data for Google Shopping / rich results.
  const jsonLd = product.isSample
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription,
        image: product.images.map((i) => new URL(i.src, siteConfig.url).toString()),
        brand: { "@type": "Brand", name: siteConfig.name },
        material: `${product.leather.type}, ${product.leather.finish}`,
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: (product.priceUsdCents / 100).toFixed(2),
          availability:
            product.fulfillment.type === "made_to_order" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
          url: new URL(`/products/${product.slug}`, siteConfig.url).toString(),
        },
      };

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <div className="container-x pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="text-[12px] text-stone">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
            {category && (
              <>
                <li aria-hidden>/</li>
                <li><Link href={`/shop?category=${category.slug}`} className="hover:text-ink">{category.name}</Link></li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={product.images} />
          </div>

          <div className="lg:pt-4">
            <p className="eyebrow text-cognac">{product.leather.origin}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{product.name}</h1>
            <p className="mt-2 text-[15px] text-stone">{product.subtitle}</p>
            <p className="mt-5 text-2xl">{formatUsd(product.priceUsdCents)}</p>
            <p className="mt-1 text-[12px] text-stone">
              Price in USD. Shipping calculated at checkout. Import duties and taxes may be charged by your country on delivery.
            </p>
            <p className="mt-6 text-[15px] leading-relaxed">{product.shortDescription}</p>

            <ProductPurchasePanel product={product} />

            {product.customWomenAvailable && (
              <div className="mt-6 bg-cream p-5 text-[13px] leading-relaxed">
                <p className="font-medium">Custom women&apos;s sizing available</p>
                <p className="mt-1 text-stone">
                  We can make this style in women&apos;s sizes on request. Email{" "}
                  <a href={`mailto:${siteConfig.contactEmail}?subject=Custom%20women%27s%20sizing%20-%20${encodeURIComponent(product.name)}`} className="underline underline-offset-4">
                    {siteConfig.contactEmail}
                  </a>{" "}
                  with your foot length in cm. See the{" "}
                  <Link href="/size-guide#women" className="underline underline-offset-4">women&apos;s size chart</Link>.
                </p>
              </div>
            )}

            <div className="mt-8 divide-y divide-sand border-y border-sand">
              <Accordion title="Description" defaultOpen>
                {product.description.map((p, i) => (
                  <p key={i} className={i > 0 ? "mt-3" : ""}>{p}</p>
                ))}
              </Accordion>
              <Accordion title="Leather & details">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {product.specs.map((s) => (
                    <div key={s.label} className="contents">
                      <dt className="text-stone">{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </Accordion>
              <Accordion title="Shipping & duties">
                <p>
                  We ship worldwide from Indonesia by express courier. Live rates and delivery estimates for your exact
                  address are shown at checkout.
                </p>
                <p className="mt-3">
                  Orders are shipped DAP: import duties and taxes, if any, are set by your country and paid on delivery.
                </p>
              </Accordion>
              {product.care.length > 0 && (
                <Accordion title="Care">
                  <ul className="list-disc space-y-1.5 pl-5">
                    {product.care.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </Accordion>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24 md:mt-32">
            <h2 className="font-serif text-4xl">You may also like</h2>
            <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
        <span className="eyebrow">{title}</span>
        <ChevronDown size={16} strokeWidth={1.5} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-5 text-[14px] leading-relaxed">{children}</div>
    </details>
  );
}
