export const siteConfig = {
  name: "AQVERO",
  tagline: "Handmade leather boots from Indonesia",
  description:
    "AQVERO crafts made-to-order leather boots by hand in Indonesia and ships them worldwide.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // TODO: replace with your real business email once the domain is set up.
  contactEmail: "hello@aqvero.com",
  currency: "USD",
  nav: [
    { label: "Shop All", href: "/shop" },
    { label: "Boots", href: "/shop?category=boots" },
    { label: "Size Guide", href: "/size-guide" },
  ],
} as const;
