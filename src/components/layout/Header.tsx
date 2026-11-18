"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useCartCount } from "@/stores/cart";
import { useHydrated } from "@/hooks";
import { useUi } from "@/stores/ui";
import { cn } from "@/lib/format";
import { Logo } from "./Logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const hydrated = useHydrated();
  const count = useCartCount();
  const openCart = useUi((s) => s.openCart);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-paper/95 backdrop-blur transition-colors duration-300",
        scrolled ? "border-sand" : "border-transparent",
      )}
    >
      <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
        {/* Left: desktop nav / mobile menu button */}
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="link-underline text-[13px] tracking-[0.08em]">
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="-ml-2 flex h-10 w-10 items-center justify-center md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>

        <Logo />

        <div className="flex items-center justify-end gap-1 md:gap-3">
          <Link href="/shop" aria-label="Browse the shop" className="hidden h-10 w-10 items-center justify-center md:flex">
            <Search size={19} strokeWidth={1.5} />
          </Link>
          <button type="button" onClick={openCart} aria-label={`Open cart, ${hydrated ? count : 0} items`} className="relative flex h-10 w-10 items-center justify-center">
            <ShoppingBag size={20} strokeWidth={1.5} />
            {hydrated && count > 0 && (
              <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-paper">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-x-0 top-[calc(4rem+1px)] bottom-0 z-40 bg-paper transition-[opacity,visibility] duration-300 md:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav aria-label="Mobile" className="container-x flex flex-col gap-1 pt-8">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="border-b border-sand py-4 font-serif text-3xl">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
