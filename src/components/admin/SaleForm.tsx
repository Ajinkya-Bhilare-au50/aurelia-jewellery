"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { CATEGORY_LABEL, formatINR } from "@/lib/format";
import { saleApplies, salePrice } from "@/lib/sales";
import type { Category, Product, Sale } from "@/lib/types";
import { SaleIcon } from "../Icons";

type ProductLite = Pick<Product, "id" | "name" | "category" | "price">;

// <input type="datetime-local"> works in local time; convert to/from ISO for the API.
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

function diwaliPreset() {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 7 * 864e5);
  end.setHours(23, 59, 0, 0);
  return {
    name: "Diwali Sale",
    bannerText: "Diwali Sale — 15% off all fine jewellery",
    type: "percent" as const,
    value: 15,
    scope: "all" as const,
    categories: [] as Category[],
    productIds: [] as string[],
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(end),
    stackWithCoupons: false,
    active: true,
  };
}

export function SaleForm({ sale, products }: { sale?: Sale; products: ProductLite[] }) {
  const router = useRouter();
  const [f, setF] = useState(() =>
    sale
      ? { ...sale, bannerText: sale.bannerText ?? "", startsAt: toLocalInput(new Date(sale.startsAt)), endsAt: toLocalInput(new Date(sale.endsAt)) }
      : { ...diwaliPreset(), name: "", bannerText: "" },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  // Live preview of what customers will pay.
  const affected = useMemo(() => {
    const s = { ...f, id: "preview" } as unknown as Sale;
    return products.filter((p) => saleApplies(s, p));
  }, [f, products]);
  const example = affected.length ? affected.reduce((a, b) => (b.price > a.price ? b : a)) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...f, value: Number(f.value), startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt) };
      await api(sale ? `/api/admin/sales/${sale.id}` : "/api/admin/sales", body, sale ? "PATCH" : "POST");
      router.push("/admin/sales");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {!sale && (
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-gold/50 bg-gold/5 p-4 text-sm">
          <SaleIcon size={18} className="text-gold" />
          <span className="text-secondary">Quick start:</span>
          <button type="button" onClick={() => setF(diwaliPreset())} className="btn-secondary btn-sm">Diwali Sale · 15% off everything · 7 days</button>
        </div>
      )}

      <section className="card grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:p-8">
        <div>
          <label className="field-label" htmlFor="name">Sale name</label>
          <input id="name" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Diwali Sale" className="input" />
          <p className="mt-2 text-[12px] text-secondary">Shown as a badge on products, e.g. “Diwali Sale”.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="bannerText">Banner text <span className="normal-case tracking-normal text-secondary">(optional)</span></label>
          <input id="bannerText" value={f.bannerText} onChange={(e) => set("bannerText", e.target.value)} maxLength={120} placeholder="Diwali Sale — 15% off all fine jewellery" className="input" />
          <p className="mt-2 text-[12px] text-secondary">Replaces the top announcement bar while the sale is live.</p>
        </div>

        <div>
          <span className="field-label">Discount</span>
          <div className="flex">
            <select aria-label="Discount type" value={f.type} onChange={(e) => set("type", e.target.value as "percent" | "flat")} className="input w-40 cursor-pointer border-r-0">
              <option value="percent">% off</option>
              <option value="flat">₹ off per item</option>
            </select>
            <input aria-label="Discount value" type="number" required min={1} max={f.type === "percent" ? 90 : undefined} value={f.value} onChange={(e) => set("value", Number(e.target.value))} className="input flex-1" />
          </div>
        </div>
        <div>
          <span className="field-label">Coupons</span>
          <label className="flex h-12 items-center gap-3 text-sm">
            <input type="checkbox" checked={f.stackWithCoupons} onChange={(e) => set("stackWithCoupons", e.target.checked)} className="h-4 w-4 accent-gold" />
            Allow coupon codes on top of sale prices
          </label>
        </div>

        <div>
          <label className="field-label" htmlFor="startsAt">Starts</label>
          <input id="startsAt" type="datetime-local" required value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} className="input" />
        </div>
        <div>
          <label className="field-label" htmlFor="endsAt">Ends</label>
          <input id="endsAt" type="datetime-local" required value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} className="input" />
        </div>
      </section>

      <section className="card space-y-5 p-6 lg:p-8">
        <span className="field-label">Applies to</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Applies to">
          {([["all", "All products"], ["categories", "Categories"], ["products", "Selected products"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={f.scope === v} onClick={() => set("scope", v)} className={f.scope === v ? "tab tab-active" : "tab border border-border"}>{l}</button>
          ))}
        </div>

        {f.scope === "categories" && (
          <div className="flex flex-wrap gap-5">
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.categories.includes(c)} onChange={() => set("categories", toggle(f.categories, c))} className="h-4 w-4 accent-gold" />
                {CATEGORY_LABEL[c]} <span className="text-secondary">({products.filter((p) => p.category === c).length})</span>
              </label>
            ))}
          </div>
        )}

        {f.scope === "products" && (
          <div className="max-h-72 overflow-y-auto border border-border">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-b-0 hover:bg-surface-elevated">
                <input type="checkbox" checked={f.productIds.includes(p.id)} onChange={() => set("productIds", toggle(f.productIds, p.id))} className="h-4 w-4 accent-gold" />
                <span className="flex-1">{p.name}</span>
                <span className="text-secondary">{CATEGORY_LABEL[p.category]}</span>
                <span className="w-24 text-right tabular-nums">{formatINR(p.price)}</span>
              </label>
            ))}
          </div>
        )}

        <p className="border-t border-border pt-4 text-sm text-secondary">
          <strong className="font-medium text-ivory">{affected.length}</strong> of {products.length} products will be discounted.
          {example && f.value > 0 && (
            <> Example: {example.name} <span className="line-through">{formatINR(example.price)}</span> → <strong className="font-medium text-gold">{formatINR(salePrice(f, example.price))}</strong>.</>
          )}
        </p>
      </section>

      {error && <p role="alert" className="border-l-2 border-error bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
      <div className="flex items-center gap-4">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : sale ? "Save changes" : "Create sale"}</button>
        <button type="button" onClick={() => router.push("/admin/sales")} className="btn-tertiary">Cancel</button>
      </div>
    </form>
  );
}
