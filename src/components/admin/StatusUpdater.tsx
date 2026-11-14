"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const COURIERS = ["Blue Dart", "Delhivery", "DTDC", "Sequel Logistics", "India Post"];

export function StatusUpdater({ orderId, options }: { orderId: string; options: OrderStatus[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | "">(options.find((o) => o !== "cancelled") ?? options[0] ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!options.length) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/orders/${orderId}`, Object.fromEntries(new FormData(e.currentTarget)), "PATCH");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 border-gold/40 p-6 lg:p-8">
      <h2 className="font-display text-2xl">Update status</h2>
      <div>
        <label htmlFor="status" className="field-label">New status</label>
        <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="input cursor-pointer">
          {options.map((o) => <option key={o} value={o}>{STATUS_LABEL[o]}</option>)}
        </select>
      </div>
      {status === "shipped" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="courier" className="field-label">Courier</label>
            <select id="courier" name="courier" required className="input cursor-pointer">{COURIERS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label htmlFor="awb" className="field-label">AWB number</label>
            <input id="awb" name="awb" required className="input" placeholder="e.g. 7789123456" />
          </div>
        </div>
      )}
      <div>
        <label htmlFor="note" className="field-label">Note for customer <span className="normal-case tracking-normal text-secondary">(optional)</span></label>
        <input id="note" name="note" className="input" placeholder="e.g. Dispatched from Mumbai hub" />
      </div>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <button className={status === "cancelled" ? "btn-danger w-full" : "btn-primary w-full"} disabled={busy}>
        {busy ? "Saving…" : `Mark as ${STATUS_LABEL[status as OrderStatus]?.toLowerCase() ?? ""}`}
      </button>
    </form>
  );
}
