"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function CouponCreateForm() {
  const router = useRouter();
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const body = Object.fromEntries([...new FormData(form)].filter(([, v]) => v !== ""));
    try {
      await api("/api/admin/coupons", body);
      form.reset();
      setType("percent");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 lg:p-8">
      <h2 className="font-display text-2xl">Create coupon</h2>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div><label className="field-label" htmlFor="code">Code</label><input id="code" name="code" required className="input uppercase" placeholder="FESTIVE15" /></div>
        <div>
          <label className="field-label" htmlFor="type">Type</label>
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as "percent" | "flat")} className="input cursor-pointer">
            <option value="percent">Percentage</option><option value="flat">Flat amount (₹)</option>
          </select>
        </div>
        <div><label className="field-label" htmlFor="value">{type === "percent" ? "Percent off" : "Amount off (₹)"}</label><input id="value" name="value" type="number" min={1} max={type === "percent" ? 90 : undefined} required className="input" /></div>
        <div><label className="field-label" htmlFor="minOrder">Min order (₹)</label><input id="minOrder" name="minOrder" type="number" min={0} defaultValue={0} className="input" /></div>
        {type === "percent" && <div><label className="field-label" htmlFor="maxDiscount">Max discount (₹)</label><input id="maxDiscount" name="maxDiscount" type="number" min={0} className="input" placeholder="No cap" /></div>}
        <div><label className="field-label" htmlFor="usageLimit">Usage limit</label><input id="usageLimit" name="usageLimit" type="number" min={0} className="input" placeholder="Unlimited" /></div>
        <div><label className="field-label" htmlFor="expiresAt">Expires on</label><input id="expiresAt" name="expiresAt" type="date" className="input" /></div>
        <div className={type === "percent" ? "" : "xl:col-span-2"}><label className="field-label" htmlFor="description">Description</label><input id="description" name="description" className="input" placeholder="Shown in admin" /></div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      <button className="btn-primary mt-6" disabled={busy}>{busy ? "Creating…" : "Create coupon"}</button>
    </form>
  );
}

export function CouponActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    await fn().catch(() => undefined);
    router.refresh();
  };
  const cls = "text-[11px] uppercase tracking-[0.12em] hover:underline";
  return (
    <span className="inline-flex gap-4 whitespace-nowrap">
      <button className={cls} onClick={() => run(() => api(`/api/admin/coupons/${id}`, { active: !active }, "PATCH"))}>{active ? "Pause" : "Activate"}</button>
      {confirm ? (
        <button className={`${cls} font-semibold text-error`} onClick={() => run(() => api(`/api/admin/coupons/${id}`, undefined, "DELETE"))}>Confirm delete</button>
      ) : (
        <button className={`${cls} text-error`} onClick={() => setConfirm(true)}>Delete</button>
      )}
    </span>
  );
}
