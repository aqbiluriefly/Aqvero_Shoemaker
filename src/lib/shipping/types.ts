export type Package = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ShipmentRequest = {
  origin: { countryCode: string; postalCode: string; city: string };
  destination: { countryCode: string; postalCode: string; city: string; state: string };
  packages: Package[];
  /** Declared customs value in USD cents. */
  declaredValueCents: number;
};

export type ShippingRate = {
  provider: string;          // "dhl" | "fedex" | "ups" | "simulated"
  serviceCode: string;       // carrier service id
  serviceName: string;       // shown to the customer
  amountCents: number;       // USD cents
  currency: "USD";
  transitDaysMin: number | null;
  transitDaysMax: number | null;
  /** True when this is NOT a real carrier rate. */
  simulated: boolean;
};

/**
 * Every courier integration implements this interface (Stage 5: DHL, FedEx, UPS).
 */
export interface ShippingProvider {
  readonly id: string;
  getRates(request: ShipmentRequest): Promise<ShippingRate[]>;
}
