"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/stores/cart";
import { countryOptions } from "@/lib/geo/countries";
import { formatUsd } from "@/lib/format";
import { SimulatedNotice, transitText, type ClientRate } from "@/components/checkout/RateOption";

/** Cart page: rough shipping estimate by country (exact rate is quoted at checkout). */
export function ShippingEstimator({ onEstimate }: { onEstimate: (cents: number | null) => void }) {
  const lines = useCart((s) => s.lines);
  const countries = useMemo(() => countryOptions(), []);
  const [country, setCountry] = useState("");
  const [rates, setRates] = useState<ClientRate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function estimate(code: string) {
    setCountry(code);
    setRates(null);
    setError("");
    onEstimate(null);
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "estimate",
          destination: { country: code },
          lines: lines.map(({ sku, productSlug, options, quantity }) => ({ sku, productSlug, options, quantity })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setRates(data.rates);
      onEstimate(data.rates[0]?.amountCents ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not estimate shipping.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="block text-[13px]">
        <span className="eyebrow">Estimate shipping</span>
        <select
          value={country}
          onChange={(e) => estimate(e.target.value)}
          className="mt-2 h-11 w-full border border-sand bg-paper px-3 text-sm outline-none focus:border-ink"
        >
          <option value="">Select your country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      {loading && <p className="mt-3 text-[12px] text-stone">Calculating…</p>}
      {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}
      {rates && (
        <div className="mt-3 space-y-2">
          {rates.some((r) => r.simulated) && <SimulatedNotice />}
          <ul className="space-y-1.5 text-[13px]">
            {rates.map((r) => (
              <li key={r.serviceCode} className="flex justify-between gap-3">
                <span>
                  {r.serviceName}
                  <span className="block text-[11px] text-stone">{transitText(r)}</span>
                </span>
                <span>{formatUsd(r.amountCents)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-stone">Final rate is confirmed at checkout for your exact address.</p>
        </div>
      )}
    </div>
  );
}
