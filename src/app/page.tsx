import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCategories, listProducts } from "@/lib/catalog/repository";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { formatUsd } from "@/lib/format";
import { fromPriceCents, hasPriceRange } from "@/lib/catalog/pricing";

const CRAFT_STEPS = [
  { n: "01", title: "Pattern & cutting", text: "Each panel is marked and cut from the hide by hand, working around natural marks in the leather." },
  { n: "02", title: "Stitching", text: "Upper pieces are closed with heavy thread for strength where a boot flexes most." },
  { n: "03", title: "Lasting", text: "The upper is pulled tight over a foot-shaped last to give the boot its final form." },
  { n: "04", title: "Finishing", text: "Edges are dressed, hardware is fitted and every pair is inspected before it leaves the workshop." },
];

export default async function HomePage() {
  const [all, newest, categories] = await Promise.all([
    listProducts({ sort: "popular" }),
    listProducts({ sort: "newest" }),
    listCategories(),
  ]);
  const bestSellers = all.filter((p) => p.isBestSeller).slice(0, 4);
  const newArrivals = newest.filter((p) => p.isNewArrival).slice(0, 4);
  const hero = all.find((p) => !p.isSample && p.images.length > 0);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="bg-cream">
        <div className="container-x grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-20 lg:py-24">
          <div className="order-2 md:order-1">
            <p className="eyebrow animate-fade-up text-cognac">Handmade in Indonesia</p>
            <h1 className="mt-5 animate-fade-up font-serif text-5xl leading-[1.02] [animation-delay:120ms] sm:text-6xl lg:text-7xl">
              Boots made by hand,<br />
              <em className="font-medium">built to outlast.</em>
            </h1>
            <p className="mt-6 max-w-md animate-fade-up text-[15px] leading-relaxed text-stone [animation-delay:240ms]">
              Every AQVERO pair is cut, stitched and finished by craftsmen in our Indonesian workshop — made to order
              for you and shipped worldwide.
            </p>
            <div className="mt-9 flex animate-fade-up flex-wrap gap-3 [animation-delay:360ms]">
              <Link href="/shop" className="btn btn-primary">Shop now</Link>
              <a href="#craftsmanship" className="btn btn-outline">Our craft</a>
            </div>
          </div>
          {hero && (
            <Link href={`/products/${hero.slug}`} className="group relative order-1 block md:order-2">
              <div className="relative aspect-[6/5] overflow-hidden">
                <Image
                  src={hero.images[0].src}
                  alt={hero.images[0].alt}
                  fill
                  priority
                  style={{ objectPosition: hero.images[0].focus }}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-soft)] group-hover:scale-[1.03]"
                />
              </div>
              <div className="absolute bottom-0 left-0 bg-paper px-5 py-4 md:-left-8 md:bottom-8">
                <p className="eyebrow text-stone">Featured</p>
                <p className="mt-1 font-serif text-xl">{hero.name} · {hasPriceRange(hero) ? "from " : ""}{formatUsd(fromPriceCents(hero))}</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ---------------- Value strip ---------------- */}
      <section className="border-b border-sand">
        <ul className="container-x grid grid-cols-1 divide-y divide-sand text-center sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ["Made to order", "Crafted for you after you order"],
            ["Genuine leather", "Pull-up cowhide that ages beautifully"],
            ["Worldwide delivery", "Live carrier rates at checkout"],
          ].map(([t, d]) => (
            <li key={t} className="px-4 py-6">
              <p className="eyebrow">{t}</p>
              <p className="mt-1.5 text-[13px] text-stone">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- Best sellers (only when real data exists) ---------------- */}
      {bestSellers.length > 0 && (
        <ProductRow eyebrow="Most loved" title="Best Sellers" products={bestSellers} href="/shop?sort=popular" />
      )}

      {/* ---------------- New arrivals ---------------- */}
      {newArrivals.length > 0 && (
        <ProductRow eyebrow="Just finished" title="New Arrivals" products={newArrivals} href="/shop?sort=newest" />
      )}

      {/* ---------------- Featured collections ---------------- */}
      {categories.length > 0 && (
        <section className="container-x mt-24 md:mt-32">
          <Reveal className="mb-10 flex items-end justify-between">
            <div>
              <p className="eyebrow text-stone">Collections</p>
              <h2 className="mt-3 font-serif text-4xl md:text-5xl">Featured Collections</h2>
            </div>
          </Reveal>
          <div className={`grid gap-4 ${categories.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}>
            {categories.slice(0, 3).map((c, i) => {
              const cover = all.find((p) => p.categorySlug === c.slug && p.images.length > 0)?.images[0];
              return (
                <Reveal key={c.slug} delay={i * 100}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className={`group relative block overflow-hidden bg-espresso ${categories.length > 1 ? "aspect-[4/5]" : "aspect-[4/5] md:aspect-[21/9]"}`}
                  >
                    {cover && (
                      <Image
                        src={cover.src}
                        alt=""
                        fill
                        style={{ objectPosition: cover.focus }}
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover opacity-80 transition-transform duration-[1.4s] ease-[var(--ease-soft)] group-hover:scale-[1.04]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 text-paper md:p-10">
                      <h3 className="font-serif text-4xl">{c.name}</h3>
                      <p className="mt-2 max-w-sm text-sm text-paper/80">{c.description}</p>
                      <span className="eyebrow mt-5 inline-flex items-center gap-2">
                        Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- Craftsmanship ---------------- */}
      <section id="craftsmanship" className="mt-24 scroll-mt-24 bg-cream py-20 md:mt-32 md:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
          <Reveal>
            <p className="eyebrow text-cognac">About our craftsmanship</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              Slow work, done by hand, one pair at a time.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-stone">
              We don&apos;t keep warehouses of finished boots. Your pair is made after you order it, which means less waste
              and more care in every step — from the first cut of leather to the final polish.
            </p>
          </Reveal>
          <ol className="grid gap-px bg-sand sm:grid-cols-2">
            {CRAFT_STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 80} className="bg-cream p-6 md:p-8">
                <span className="font-serif text-2xl text-cognac">{s.n}</span>
                <h3 className="mt-3 font-serif text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Reviews ---------------- */}
      <section className="container-x mt-24 text-center md:mt-32">
        <Reveal>
          <p className="eyebrow text-stone">Customer reviews</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">From the people who wear them</h2>
          {/* Reviews come only from verified purchases (Supabase `reviews`, Stage 4). No invented testimonials. */}
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-stone">
            Verified reviews from our first customers will appear here. Bought a pair? We&apos;d love to hear how they
            wear in.
          </p>
        </Reveal>
      </section>

      {/* ---------------- Newsletter ---------------- */}
      <section className="container-x mt-24 md:mt-32">
        <Reveal className="border border-sand px-6 py-14 text-center md:py-20">
          <p className="eyebrow text-stone">Newsletter</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Be first to see new pairs</h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-stone">
            New releases, workshop stories and care tips. No spam — unsubscribe anytime.
          </p>
          <NewsletterForm />
        </Reveal>
      </section>
    </>
  );
}

function ProductRow({
  eyebrow,
  title,
  products,
  href,
}: {
  eyebrow: string;
  title: string;
  products: Awaited<ReturnType<typeof listProducts>>;
  href: string;
}) {
  return (
    <section className="container-x mt-20 md:mt-28">
      <Reveal className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-stone">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">{title}</h2>
        </div>
        <Link href={href} className="eyebrow link-underline shrink-0">View all</Link>
      </Reveal>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4">
        {products.map((p, i) => (
          <Reveal key={p.slug} delay={i * 80}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
