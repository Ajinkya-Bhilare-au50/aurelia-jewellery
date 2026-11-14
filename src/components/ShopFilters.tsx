"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { METALS, PRICE_RANGES, PURITIES, SORTS } from "@/lib/catalog";
import { CloseIcon, FilterIcon } from "./Icons";
import { ShopSearch } from "./ShopSearch";

const FILTER_KEYS = ["metal", "purity", "price", "stock", "sale"] as const;

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const clear = () => {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach((k) => next.delete(k));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return { params, set, clear };
}

const selectCls = "input h-10 w-auto min-w-0 cursor-pointer pr-8 text-[13px]";

function Controls({ stacked }: { stacked?: boolean }) {
  const { params, set } = useParamSetter();
  const wrap = stacked ? "flex flex-col gap-2" : "contents";
  const sel = stacked ? `${selectCls} !h-12 !w-full` : selectCls;
  const toggle = (key: string, label: string) => (
    <label className={`flex cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] text-secondary hover:text-ivory ${stacked ? "min-h-[44px]" : ""}`}>
      <input type="checkbox" className="h-4 w-4 accent-gold" checked={params.get(key) === "1"} onChange={(e) => set(key, e.target.checked ? "1" : "")} />
      {label}
    </label>
  );
  return (
    <>
      <div className={wrap}>
        {stacked && <label htmlFor="f-price" className="field-label">Price</label>}
        <select id="f-price" aria-label="Price" className={sel} value={params.get("price") ?? ""} onChange={(e) => set("price", e.target.value)}>
          <option value="">Any price</option>
          {PRICE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className={wrap}>
        {stacked && <label htmlFor="f-metal" className="field-label">Material</label>}
        <select id="f-metal" aria-label="Material" className={sel} value={params.get("metal") ?? ""} onChange={(e) => set("metal", e.target.value)}>
          <option value="">All metals</option>
          {METALS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className={wrap}>
        {stacked && <label htmlFor="f-purity" className="field-label">Purity</label>}
        <select id="f-purity" aria-label="Purity" className={sel} value={params.get("purity") ?? ""} onChange={(e) => set("purity", e.target.value)}>
          <option value="">Any purity</option>
          {PURITIES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className={stacked ? "flex flex-col border-y border-border py-2" : "contents"}>
        {toggle("stock", "In stock")}
        {toggle("sale", "On sale")}
      </div>
    </>
  );
}

export function SortSelect() {
  const { params, set } = useParamSetter();
  return (
    <select aria-label="Sort by" className={selectCls} value={params.get("sort") ?? "featured"} onChange={(e) => set("sort", e.target.value === "featured" ? "" : e.target.value)}>
      {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function ShopFilters({ resultCount }: { resultCount: number }) {
  const { params, clear } = useParamSetter();
  const [open, setOpen] = useState(false);
  const active = FILTER_KEYS.filter((k) => params.get(k)).length;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop toolbar */}
      <div className="hidden flex-wrap items-center gap-3 lg:flex">
        <ShopSearch className="w-56 xl:w-64" />
        <Controls />
        {active > 0 && <button onClick={clear} className="text-[12px] text-secondary underline underline-offset-4 hover:text-ivory">Clear ({active})</button>}
      </div>

      {/* Mobile trigger */}
      <button onClick={() => setOpen(true)} className="btn-secondary btn-sm lg:hidden" aria-haspopup="dialog">
        <FilterIcon width={16} height={16} /> Filters{active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] text-background">{active}</span>}
      </button>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside role="dialog" aria-label="Filters" className={`absolute bottom-0 right-0 top-0 flex w-full max-w-[400px] flex-col bg-surface-elevated transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
          <header className="flex h-16 items-center justify-between border-b border-border px-5">
            <h2 className="font-display text-2xl">Filters</h2>
            <button aria-label="Close filters" className="icon-btn -mr-3" onClick={() => setOpen(false)}><CloseIcon /></button>
          </header>
          {open && <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5"><Controls stacked /></div>}
          <footer className="grid grid-cols-2 gap-3 border-t border-border p-5">
            <button onClick={clear} className="btn-secondary" disabled={!active}>Clear all</button>
            <button onClick={() => setOpen(false)} className="btn-primary">Show {resultCount}</button>
          </footer>
        </aside>
      </div>
    </>
  );
}
