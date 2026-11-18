"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useCart } from "@/stores/cart";
import { usePricedCart } from "@/components/cart/usePricedCart";
import {
  countryName,
  countryOptions,
  postalLabel,
  postalRequired,
  stateLabel,
  stateRequirement,
  STATES,
} from "@/lib/geo/countries";
import { addressSchema, fieldErrors } from "@/lib/validation/checkout";
import { formatUsd, cn } from "@/lib/format";
import { RateOption, SimulatedNotice, type ClientRate } from "./RateOption";

type Address = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
  notes: string;
};

const EMPTY: Address = {
  fullName: "", email: "", phone: "", country: "", state: "", city: "",
  address1: "", address2: "", postalCode: "", notes: "",
};

const STORAGE_KEY = "aqvero-checkout-address";
const RATE_FIELDS: (keyof Address)[] = ["country", "state", "city", "postalCode"];

type Summary = {
  subtotalCents: number;
  totalCents: number;
  shipping: { serviceName: string; amountCents: number; simulated: boolean };
};

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
      );
}

export function CheckoutForm() {
  const { cart, hydrated, notices } = usePricedCart();
  const lines = useCart((s) => s.lines);
  const countries = useMemo(() => countryOptions(), []);

  const [address, setAddress] = useState<Address>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<ClientRate[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [idempotencyKey] = useState(newKey);

  // Restore an unfinished address (this browser tab only).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage after mount
      if (saved) setAddress({ ...EMPTY, ...JSON.parse(saved) });
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(address));
    } catch {
      /* storage unavailable */
    }
  }, [address]);

  // Cart changes invalidate rates and the reviewed summary.
  const cartKey = JSON.stringify(lines.map((l) => [l.lineId, l.quantity]));
  const [lastCartKey, setLastCartKey] = useState(cartKey);
  if (cartKey !== lastCartKey) {
    setLastCartKey(cartKey);
    setRates(null);
    setSelectedRate("");
    setSummary(null);
  }

  function update<K extends keyof Address>(key: K, value: Address[K]) {
    setAddress((a) => {
      const next = { ...a, [key]: value };
      if (key === "country") next.state = "";
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
    setSummary(null);
    if (RATE_FIELDS.includes(key)) {
      setRates(null);
      setSelectedRate("");
      setRatesError("");
    }
  }

  function validate(): boolean {
    const result = addressSchema.safeParse(address);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(fieldErrors(result.error));
    return false;
  }

  async function calculateShipping() {
    setRatesError("");
    if (!validate()) {
      setRatesError("Please complete your shipping address first.");
      return;
    }
    setRatesLoading(true);
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quote",
          destination: {
            country: address.country,
            postalCode: address.postalCode,
            city: address.city,
            state: address.state,
          },
          lines: lines.map(({ sku, productSlug, options, quantity }) => ({ sku, productSlug, options, quantity })),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setRates(data.rates);
      setSelectedRate(data.rates[0]?.serviceCode ?? "");
    } catch (e) {
      setRatesError(e instanceof Error ? e.message : "Could not calculate shipping.");
    } finally {
      setRatesLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validate()) {
      setFormError("Please check the highlighted fields.");
      return;
    }
    const rate = rates?.find((r) => r.serviceCode === selectedRate);
    if (!rate?.token) {
      setFormError("Please calculate and choose a shipping method.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          shippingQuoteToken: rate.token,
          idempotencyKey,
          lines: lines.map(({ sku, productSlug, options, quantity }) => ({ sku, productSlug, options, quantity })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        if (data.code === "SHIPPING_QUOTE_INVALID") {
          setRates(null);
          setSelectedRate("");
        }
        throw new Error(data.message);
      }
      setSummary(data.summary);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || !cart) return <p className="mt-10 text-stone">Loading checkout…</p>;

  if (cart.lines.length === 0) {
    return (
      <div className="mt-10">
        {notices.map((n) => <p key={n} className="mb-4 bg-cream px-4 py-3 text-sm">{n}</p>)}
        <p className="text-stone">Your cart is empty.</p>
        <Link href="/shop" className="btn btn-primary mt-8">Shop now</Link>
      </div>
    );
  }

  const rate = rates?.find((r) => r.serviceCode === selectedRate);
  const stateMode = address.country ? stateRequirement(address.country) : "optional";

  return (
    <form onSubmit={submit} noValidate className="mt-10 grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-16">
      <div className="space-y-12">
        {notices.map((n) => <p key={n} className="bg-cream px-4 py-3 text-sm">{n}</p>)}

        {/* Contact */}
        <section>
          <h2 className="font-serif text-3xl">Contact</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email} className="sm:col-span-2">
              <input type="email" autoComplete="email" value={address.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Phone number" hint="Include country code, e.g. +1 415 555 0123. Couriers call this if needed." error={errors.phone} className="sm:col-span-2">
              <input type="tel" autoComplete="tel" value={address.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Address */}
        <section>
          <h2 className="font-serif text-3xl">Shipping address</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName} className="sm:col-span-2">
              <input autoComplete="name" value={address.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </Field>
            <Field label="Country" error={errors.country} className="sm:col-span-2">
              <select autoComplete="country" value={address.country} onChange={(e) => update("country", e.target.value)}>
                <option value="">Select country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Street address" error={errors.address1} className="sm:col-span-2">
              <input autoComplete="address-line1" value={address.address1} onChange={(e) => update("address1", e.target.value)} />
            </Field>
            <Field label="Apartment, suite, etc. (optional)" error={errors.address2} className="sm:col-span-2">
              <input autoComplete="address-line2" value={address.address2} onChange={(e) => update("address2", e.target.value)} />
            </Field>
            <Field label="City" error={errors.city}>
              <input autoComplete="address-level2" value={address.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field
              label={`${address.country ? stateLabel(address.country) : "State / Province"}${stateMode === "optional" ? " (optional)" : ""}`}
              error={errors.state}
            >
              {stateMode === "select" ? (
                <select autoComplete="address-level1" value={address.state} onChange={(e) => update("state", e.target.value)}>
                  <option value="">Select</option>
                  {STATES[address.country].map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              ) : (
                <input autoComplete="address-level1" value={address.state} onChange={(e) => update("state", e.target.value)} />
              )}
            </Field>
            <Field
              label={`${postalLabel(address.country)}${address.country && !postalRequired(address.country) ? " (optional)" : ""}`}
              error={errors.postalCode}
            >
              <input autoComplete="postal-code" value={address.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
            </Field>
            <Field label="Additional notes (optional)" hint="Delivery instructions or notes about your order." error={errors.notes} className="sm:col-span-2">
              <textarea rows={3} maxLength={500} value={address.notes} onChange={(e) => update("notes", e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Shipping method */}
        <section>
          <h2 className="font-serif text-3xl">Shipping method</h2>
          <p className="mt-2 text-[13px] text-stone">
            Shipped from our workshop in Indonesia after production. Import duties and taxes, if any, are charged by your
            country on delivery (DAP).
          </p>
          <div className="mt-6 space-y-3">
            {!rates && (
              <button type="button" onClick={calculateShipping} disabled={ratesLoading} className="btn btn-outline w-full sm:w-auto">
                {ratesLoading ? "Calculating…" : "Calculate shipping"}
              </button>
            )}
            {ratesError && <p className="text-[13px] text-red-700">{ratesError}</p>}
            {rates && (
              <>
                {rates.some((r) => r.simulated) && <SimulatedNotice />}
                {rates.map((r) => (
                  <RateOption key={r.serviceCode} name="shipping-rate" rate={r} selected={selectedRate === r.serviceCode} onSelect={() => { setSelectedRate(r.serviceCode); setSummary(null); }} />
                ))}
                <p className="text-[12px] text-stone">
                  Rates for {address.city}, {countryName(address.country)}. Quotes are valid for 30 minutes.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit bg-cream p-6 lg:sticky lg:top-28">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <ul className="mt-5 divide-y divide-sand">
          {cart.lines.map((l) => (
            <li key={l.lineId} className="flex gap-3 py-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-paper">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" style={{ objectPosition: l.imageFocus }} />}
                <span className="absolute -top-0 -right-0 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[10px] text-paper">{l.quantity}</span>
              </div>
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-medium">{l.name}</p>
                <p className="text-[11px] text-stone">{l.colorName} · {l.sizeLabel}</p>
                <p className="text-[11px] text-stone">{l.optionLabels.join(" · ")}</p>
              </div>
              <p className="text-[13px]">{formatUsd(l.lineTotalCents)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-sand pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatUsd(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping{rate?.simulated && <span className="ml-1 text-[11px] text-cognac">(simulated)</span>}</dt>
            <dd className={cn(!rate && "text-stone")}>{rate ? formatUsd(rate.amountCents) : "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-sand pt-3 text-base font-medium">
            <dt>Total (USD)</dt>
            <dd>{formatUsd(cart.subtotalCents + (rate?.amountCents ?? 0))}</dd>
          </div>
        </dl>

        {formError && <p role="alert" className="mt-4 text-[13px] text-red-700">{formError}</p>}

        {!summary ? (
          <button type="submit" disabled={submitting} className="btn btn-primary mt-6 w-full">
            {submitting ? "Checking…" : "Review order"}
          </button>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="bg-paper px-3 py-2 text-[12px] leading-relaxed">
              ✓ Order verified by the server: {formatUsd(summary.subtotalCents)} + {formatUsd(summary.shipping.amountCents)} shipping ={" "}
              <strong>{formatUsd(summary.totalCents)}</strong>.
            </p>
            {/* Stage 6: this button creates the payment session and redirects to the secure payment page. */}
            <button type="button" disabled className="btn btn-primary w-full" title="Payment gateway is connected in Stage 6">
              <Lock size={14} /> Pay securely
            </button>
            <p className="text-[11px] text-stone">Development: card payment is connected in Stage 6. No order has been placed.</p>
          </div>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-stone">
          <Lock size={12} /> Card details are entered on the payment provider&apos;s secure page, never on this site.
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[12px] text-stone">{label}</span>
      <span
        className={cn(
          "mt-1.5 block [&>input]:h-11 [&>input]:w-full [&>select]:h-11 [&>select]:w-full [&>textarea]:w-full [&>*]:border [&>*]:bg-paper [&>*]:px-3 [&>*]:text-sm [&>*]:outline-none [&>*]:transition-colors [&>*:focus]:border-ink [&>textarea]:py-2",
          error ? "[&>*]:border-red-700" : "[&>*]:border-sand",
        )}
      >
        {children}
      </span>
      {error ? (
        <span className="mt-1 block text-[12px] text-red-700">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-stone">{hint}</span>
      ) : null}
    </label>
  );
}
