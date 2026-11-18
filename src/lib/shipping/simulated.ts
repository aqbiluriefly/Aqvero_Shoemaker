import { chargeableWeightKg } from "./packaging";
import type { ShipmentRequest, ShippingProvider, ShippingRate } from "./types";

/**
 * DEVELOPMENT SIMULATOR — NOT REAL CARRIER PRICES.
 * Produces placeholder numbers so the checkout flow can be built and tested
 * before courier API accounts exist. Every rate is flagged `simulated: true`
 * and the UI labels it clearly. Checkout with simulated rates is refused
 * unless ALLOW_SIMULATED_CHECKOUT=true (never set this in production).
 */

const ZONES: Record<string, string[]> = {
  asia_near: ["SG", "MY", "BN", "TH", "PH", "VN", "KH", "LA", "MM", "TL"],
  asia_pacific: ["AU", "NZ", "JP", "KR", "CN", "HK", "TW", "MO", "IN"],
  north_america: ["US", "CA", "MX"],
  europe: [
    "GB", "IE", "DE", "FR", "IT", "ES", "PT", "NL", "BE", "LU", "AT", "CH", "DK", "SE", "NO", "FI", "IS",
    "PL", "CZ", "SK", "HU", "SI", "HR", "RO", "BG", "GR", "EE", "LV", "LT", "MT", "CY", "MC", "LI",
  ],
};

// Placeholder parameters (USD): base per shipment + per chargeable kg.
const ZONE_PARAMS: Record<string, { base: number; perKg: number; transit: [number, number] }> = {
  asia_near: { base: 25, perKg: 8, transit: [2, 4] },
  asia_pacific: { base: 35, perKg: 11, transit: [3, 5] },
  north_america: { base: 45, perKg: 14, transit: [4, 6] },
  europe: { base: 45, perKg: 13, transit: [4, 7] },
  rest: { base: 55, perKg: 17, transit: [5, 10] },
};

function zoneOf(country: string): string {
  return Object.entries(ZONES).find(([, list]) => list.includes(country))?.[0] ?? "rest";
}

export class SimulatedShippingProvider implements ShippingProvider {
  readonly id = "simulated";

  async getRates(request: ShipmentRequest): Promise<ShippingRate[]> {
    const params = ZONE_PARAMS[zoneOf(request.destination.countryCode)];
    const kg = chargeableWeightKg(request.packages);
    const express = Math.round((params.base + params.perKg * kg) * 100);
    const economy = Math.round(express * 0.78);

    return [
      {
        provider: this.id,
        serviceCode: "SIM_EXPRESS",
        serviceName: "Express (simulated)",
        amountCents: express,
        currency: "USD",
        transitDaysMin: params.transit[0],
        transitDaysMax: params.transit[1],
        simulated: true,
      },
      {
        provider: this.id,
        serviceCode: "SIM_ECONOMY",
        serviceName: "Economy express (simulated)",
        amountCents: economy,
        currency: "USD",
        transitDaysMin: params.transit[0] + 2,
        transitDaysMax: params.transit[1] + 3,
        simulated: true,
      },
    ];
  }
}
