import "server-only";
import { SimulatedShippingProvider } from "./simulated";
import type { ShippingProvider } from "./types";

/**
 * Returns the active courier providers based on environment configuration.
 * Stage 5 adds DhlProvider / FedexProvider / UpsProvider here; each is only
 * enabled when its credentials are present AND it has been tested.
 */
export function getShippingProviders(): ShippingProvider[] {
  const configured = (process.env.SHIPPING_PROVIDERS ?? "simulated")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const providers: ShippingProvider[] = [];
  for (const id of configured) {
    if (id === "simulated") providers.push(new SimulatedShippingProvider());
    // Stage 5: if (id === "dhl") providers.push(new DhlProvider(...));
  }
  return providers;
}

export function simulatedCheckoutAllowed(): boolean {
  return process.env.ALLOW_SIMULATED_CHECKOUT === "true" && process.env.VERCEL_ENV !== "production";
}
