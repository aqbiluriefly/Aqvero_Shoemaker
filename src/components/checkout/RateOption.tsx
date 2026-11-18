import { formatUsd, cn } from "@/lib/format";

export type ClientRate = {
  provider: string;
  serviceCode: string;
  serviceName: string;
  amountCents: number;
  transitDaysMin: number | null;
  transitDaysMax: number | null;
  simulated: boolean;
  token?: string;
};

export function transitText(r: { transitDaysMin: number | null; transitDaysMax: number | null }): string {
  if (r.transitDaysMin == null) return "Delivery estimate unavailable";
  return r.transitDaysMax && r.transitDaysMax !== r.transitDaysMin
    ? `${r.transitDaysMin}–${r.transitDaysMax} business days in transit`
    : `${r.transitDaysMin} business days in transit`;
}

export function SimulatedNotice() {
  return (
    <p className="border border-cognac/40 bg-cognac/5 px-3 py-2 text-[12px] leading-relaxed text-cognac">
      <strong className="font-medium">Development estimate — not a live carrier rate.</strong> Real DHL / FedEx / UPS
      rates replace these once courier accounts are connected.
    </p>
  );
}

export function RateOption({
  rate,
  selected,
  onSelect,
  name,
}: {
  rate: ClientRate;
  selected: boolean;
  onSelect: () => void;
  name: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-4 border px-4 py-3.5 transition-colors", selected ? "border-ink" : "border-sand hover:border-stone")}>
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="accent-ink" />
      <span className="flex-1">
        <span className="block text-sm font-medium">{rate.serviceName}</span>
        <span className="block text-[12px] text-stone">{transitText(rate)}</span>
      </span>
      <span className="text-sm">{formatUsd(rate.amountCents)}</span>
    </label>
  );
}
