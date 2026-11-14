"use client";

import type { Category } from "@/lib/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartLine {
  key: string; // productId + size
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number; // display only; the server reprices at checkout
  qty: number;
  size?: string;
  maxQty: number;
  metal?: string;
  category?: Category;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  add: (line: Omit<CartLine, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Update displayed prices from a server quote (e.g. a sale started after items were added). */
  syncPrices: (items: { productId: string; size?: string; price: number }[]) => void;
  coupon: string;
  setCoupon: (code: string) => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "aurelia_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [coupon, setCouponState] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
      setCouponState(localStorage.getItem(KEY + "_coupon") ?? "");
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback<CartCtx["add"]>((line, qty = 1) => {
    const key = `${line.productId}:${line.size ?? ""}`;
    setLines((prev) => {
      const hit = prev.find((l) => l.key === key);
      if (hit) return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, l.maxQty, 10) } : l));
      return [...prev, { ...line, key, qty: Math.min(qty, line.maxQty, 10) }];
    });
    setDrawerOpen(true);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(qty, l.maxQty, 10)) } : l)));
  }, []);
  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const setCoupon = useCallback((code: string) => {
    setCouponState(code);
    try {
      localStorage.setItem(KEY + "_coupon", code);
    } catch {}
  }, []);
  const syncPrices = useCallback((items: { productId: string; size?: string; price: number }[]) => {
    const price = new Map(items.map((i) => [i.productId + (i.size ?? ""), i.price]));
    setLines((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        const p = price.get(l.productId + (l.size ?? ""));
        if (p == null || p === l.price) return l;
        changed = true;
        return { ...l, price: p };
      });
      return changed ? next : prev; // same array → no re-render loop
    });
  }, []);
  const clear = useCallback(() => {
    setLines([]);
    setCoupon("");
  }, [setCoupon]);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
      drawerOpen,
      setDrawerOpen,
      add,
      setQty,
      remove,
      clear,
      syncPrices,
      coupon,
      setCoupon,
    }),
    [lines, ready, drawerOpen, add, setQty, remove, clear, syncPrices, coupon, setCoupon],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const toCartPayload = (lines: CartLine[]) => lines.map((l) => ({ productId: l.productId, qty: l.qty, size: l.size }));
