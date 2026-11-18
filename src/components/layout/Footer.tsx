import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="container-x grid gap-12 py-16 md:grid-cols-4 md:py-20">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-cream/70">
            Leather boots cut, stitched and finished by hand in Indonesia — made to order and shipped worldwide.
          </p>
        </div>
        <div>
          <h2 className="eyebrow text-cream/50">Shop</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link href="/shop" className="link-underline">All products</Link></li>
            <li><Link href="/shop?category=boots" className="link-underline">Boots</Link></li>
            <li><Link href="/shop?sort=newest" className="link-underline">New arrivals</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow text-cream/50">Help</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link href="/size-guide" className="link-underline">Size guide</Link></li>
            <li><a href={`mailto:${siteConfig.contactEmail}`} className="link-underline">{siteConfig.contactEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-cream/50 md:flex-row md:justify-between">
          <p>© {year} {siteConfig.name}. All rights reserved.</p>
          <p>Prices in USD · Handmade in Indonesia</p>
        </div>
      </div>
    </footer>
  );
}
