"use client";

import { useState } from "react";
import { OrderTimeline, StatusBadge } from "@/components/OrderTimeline";
import { api } from "@/lib/client";
import type { OrderStatus, TimelineEntry } from "@/lib/types";

type Result = { number: string; status: OrderStatus; timeline: TimelineEntry[]; courier?: string; awb?: string; city: string; items: { name: string; qty: number }[] };

export default function TrackPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      setResult(await api<Result>("/api/track", Object.fromEntries(new FormData(e.currentTarget))));
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="label !text-gold">Client care</p>
        <h1 className="h-display mt-4 h-page">Track your order</h1>
        <p className="mt-3 text-secondary">Enter your order number and the email used at checkout.</p>
      </div>
      <form onSubmit={onSubmit} className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="number" className="field-label">Order number</label>
          <input id="number" name="number" required placeholder="AUR-10231" className="input uppercase placeholder:normal-case" />
        </div>
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <button className="btn-primary" disabled={loading}>{loading ? "Finding…" : "Track"}</button>
      </form>
      {error && <p role="alert" className="mx-auto mt-6 max-w-2xl border-l-2 border-error bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
      {result && (
        <section className="card mx-auto mt-12 max-w-3xl p-6 animate-fade lg:p-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-3xl">{result.number}</p>
              <p className="mt-1 text-sm text-secondary">{result.items.map((i) => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join(", ")} · to {result.city}</p>
            </div>
            <StatusBadge status={result.status} />
          </div>
          <OrderTimeline status={result.status} timeline={result.timeline} courier={result.courier} awb={result.awb} />
        </section>
      )}
    </div>
  );
}
