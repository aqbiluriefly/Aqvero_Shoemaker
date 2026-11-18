import { shippingConfig } from "@/config/shipping";
import type { Package } from "./types";

/**
 * Builds the parcel list for a cart. Each pair ships in its own box
 * (multi-piece shipment), which all express couriers support.
 * Weight per pair already includes the box.
 */
export function buildPackages(lines: { weightKg: number; quantity: number }[]): Package[] {
  const { lengthCm, widthCm, heightCm } = shippingConfig.defaultBox;
  return lines.flatMap((l) =>
    Array.from({ length: l.quantity }, () => ({ weightKg: l.weightKg, lengthCm, widthCm, heightCm })),
  );
}

export function volumetricWeightKg(p: Package): number {
  return (p.lengthCm * p.widthCm * p.heightCm) / shippingConfig.volumetricDivisor;
}

/** Couriers bill the greater of actual and volumetric weight, per package, rounded up to 0.5 kg. */
export function chargeableWeightKg(packages: Package[]): number {
  return packages.reduce((sum, p) => sum + Math.ceil(Math.max(p.weightKg, volumetricWeightKg(p)) * 2) / 2, 0);
}
