/**
 * Shipping origin and packaging. Used by the shipping-rate calculator (Stage 5).
 * In Stage 7 these move to the admin "Settings" page.
 */
export const shippingConfig = {
  // TODO (owner): your workshop's pickup address in Indonesia.
  origin: {
    countryCode: "ID",
    city: "",
    postalCode: "",
  },
  /**
   * Default box for one pair of 8" boots.
   * ⚠️ ESTIMATE — replace with your real box size. Weight per pair (3 kg)
   * already includes the box.
   * Volumetric weight (DHL/FedEx, divisor 5000): 35×30×14/5000 = 2.94 kg,
   * so the chargeable weight is the actual 3 kg.
   */
  defaultBox: { lengthCm: 35, widthCm: 30, heightCm: 14 },
  volumetricDivisor: 5000,
} as const;
