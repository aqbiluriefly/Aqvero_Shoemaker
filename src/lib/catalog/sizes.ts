import type { SizeSystem } from "./types";

export type SizeRow = { us: number; uk: number; eu: number; cm: number };

/**
 * Standard conversion charts. Foot length in centimetres.
 * TODO (owner): confirm against your own lasts — handmade boots often fit
 * differently from mass-market sizing.
 */
export const SIZE_CHARTS: Record<SizeSystem, SizeRow[]> = {
  men: [
    { us: 7, uk: 6, eu: 40, cm: 25.0 },
    { us: 7.5, uk: 6.5, eu: 40.5, cm: 25.4 },
    { us: 8, uk: 7, eu: 41, cm: 25.8 },
    { us: 8.5, uk: 7.5, eu: 42, cm: 26.2 },
    { us: 9, uk: 8, eu: 42.5, cm: 26.7 },
    { us: 9.5, uk: 8.5, eu: 43, cm: 27.1 },
    { us: 10, uk: 9, eu: 44, cm: 27.5 },
    { us: 10.5, uk: 9.5, eu: 44.5, cm: 27.9 },
    { us: 11, uk: 10, eu: 45, cm: 28.3 },
    { us: 11.5, uk: 10.5, eu: 45.5, cm: 28.8 },
    { us: 12, uk: 11, eu: 46, cm: 29.2 },
    { us: 13, uk: 12, eu: 47, cm: 30.0 },
  ],
  women: [
    { us: 5, uk: 3, eu: 35.5, cm: 22.0 },
    { us: 5.5, uk: 3.5, eu: 36, cm: 22.4 },
    { us: 6, uk: 4, eu: 36.5, cm: 22.9 },
    { us: 6.5, uk: 4.5, eu: 37, cm: 23.3 },
    { us: 7, uk: 5, eu: 37.5, cm: 23.7 },
    { us: 7.5, uk: 5.5, eu: 38, cm: 24.1 },
    { us: 8, uk: 6, eu: 38.5, cm: 24.6 },
    { us: 8.5, uk: 6.5, eu: 39, cm: 25.0 },
    { us: 9, uk: 7, eu: 40, cm: 25.4 },
    { us: 9.5, uk: 7.5, eu: 40.5, cm: 25.8 },
    { us: 10, uk: 8, eu: 41, cm: 26.2 },
    { us: 11, uk: 9, eu: 42, cm: 27.1 },
  ],
};

export const SIZE_LABEL_SYSTEMS = ["us", "uk", "eu", "cm"] as const;
export type SizeLabelSystem = (typeof SIZE_LABEL_SYSTEMS)[number];

export function findSizeRow(system: SizeSystem, us: number): SizeRow | undefined {
  return SIZE_CHARTS[system].find((r) => r.us === us);
}

export function formatSize(value: number, labelSystem: SizeLabelSystem): string {
  const v = Number.isInteger(value) ? String(value) : value.toFixed(1);
  switch (labelSystem) {
    case "us":
      return `US ${v}`;
    case "uk":
      return `UK ${v}`;
    case "eu":
      return `EU ${v}`;
    case "cm":
      return `${value.toFixed(1)} cm`;
  }
}
