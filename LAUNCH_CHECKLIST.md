# AQVERO — Pre-launch checklist

Items that MUST be resolved before the site goes live.

## Content & legal
- [ ] **Replace the Engineer Boot photo** (`public/images/products/engineer-boot-black-lifestyle.webp`).
      It is a third-party photo used only as a development placeholder. Editing a photo does not transfer
      its copyright, and showing a boot that is not the one customers receive is misleading. Use your own
      photos of your own boots (side, front, back, sole, stitching detail, on-foot).
- [ ] Confirm lining material and heel height (`src/lib/catalog/data.ts` → `specs`).
- [ ] "Vibram" is a registered trademark — only offer it if you use genuine Vibram soles.
- [ ] Confirm size range and that the size charts match your lasts (`src/lib/catalog/sizes.ts`).
- [ ] Real contact email (`src/config/site.ts`).
- [ ] Shipping, Returns/Refund, Privacy and Terms pages.

## Shipping
- [ ] Measure the real shipping box and update `src/config/shipping.ts` (currently an estimate: 35×30×14 cm).
- [ ] Workshop pickup address and postal code.

## Accounts
- [ ] NIB / NPWP, business bank account.
- [ ] Payment gateway account verified for international cards.
- [ ] Courier account(s) with API access (DHL Express / FedEx / UPS).

## Technical
- [ ] `SHOW_SAMPLE_PRODUCTS=false` in production.
