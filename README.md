# AQVERO — Handmade Leather Boots Store

Next.js (App Router) + TypeScript + Tailwind CSS. Supabase, shipping APIs and the payment gateway are added in later stages.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values (see comments in the file)
# generate SHIPPING_QUOTE_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
npm run dev                  # http://localhost:3000
```

## Project structure

| Path | Purpose |
|---|---|
| `src/app/page.tsx` | Homepage |
| `src/app/shop/page.tsx` | Catalog with filters (category, size, price, colour) and sorting |
| `src/app/products/[slug]/page.tsx` | Product detail |
| `src/app/size-guide/page.tsx` | US / UK / EU / CM size charts |
| `src/app/cart/page.tsx` | Cart page with shipping estimate |
| `src/app/checkout/page.tsx` | International checkout |
| `src/app/api/cart/price` | Server-side cart pricing (never trusts browser prices) |
| `src/app/api/shipping/rates` | Shipping rates + signed quote tokens |
| `src/app/api/checkout` | Validates address, cart and shipping quote; returns server totals |
| `src/lib/shipping/` | Courier provider interface, packaging, simulator, quote signing |
| `src/lib/geo/countries.ts` | Shippable countries, states, postal-code rules |
| `src/lib/validation/checkout.ts` | Zod schemas shared by browser and server |
| `src/app/api/newsletter/route.ts` | Newsletter sign-up (validation only until Stage 4) |
| `src/lib/catalog/data.ts` | Temporary product data (moves to Supabase in Stage 4) |
| `src/lib/catalog/repository.ts` | The only data-access layer pages use |
| `src/lib/catalog/sizes.ts` | Size conversion charts |
| `src/stores/cart.ts` | Cart persisted in localStorage (IDs and quantities only, never prices) |
| `src/components/` | UI components (layout, product, shop, home) |
| `src/app/globals.css` | Design tokens: colours, fonts, buttons |

## Roadmap

- [x] Stage 1 — Architecture & design
- [x] Stage 2 — Homepage, catalog, product detail
- [x] Stage 3 — Cart & checkout (server-priced cart, signed shipping quotes, simulated rates)
- [ ] Stage 4 — Supabase (database, auth, RLS)
- [ ] Stage 5 — International shipping rates (DHL / FedEx / UPS)
- [ ] Stage 6 — Payment gateway
- [ ] Stage 7 — Admin dashboard
- [ ] Stage 8 — Testing
- [ ] Stage 9 — Deployment & domain
