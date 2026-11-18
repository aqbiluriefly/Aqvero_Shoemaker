"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email");
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setStatus(data.ok ? "done" : "error");
      setMessage(data.message);
      if (data.ok) form.reset();
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 w-full max-w-md" noValidate>
      <div className="flex border-b border-ink">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-stone"
        />
        <button type="submit" disabled={status === "loading"} className="eyebrow px-2 py-3 disabled:opacity-50">
          {status === "loading" ? "…" : "Subscribe"}
        </button>
      </div>
      <p role="status" className={`mt-3 min-h-5 text-xs ${status === "error" ? "text-red-700" : "text-stone"}`}>
        {message}
      </p>
    </form>
  );
}
