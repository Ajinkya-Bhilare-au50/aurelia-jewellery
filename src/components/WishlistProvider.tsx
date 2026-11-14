"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/lib/types";

export interface WishItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  metal: string;
  category: Category;
  stock: number;
  compareAtPrice?: number;
}

interface WishCtx {
  items: WishItem[];
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (item: WishItem) => boolean; // returns new state
  save: (item: WishItem) => void;
  remove: (productId: string) => void;
}

const Ctx = createContext<WishCtx | null>(null);
const KEY = "aurelia_wishlist_v1";

/** Client-side wishlist (per browser). Swap for an API-backed list when accounts need it across devices. */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  // Once per page load: refresh saved items with live price / stock (sales, restocks) and
  // drop products that no longer exist. Stored copies are only a fallback for offline display.
  const refreshed = useRef(false);
  useEffect(() => {
    if (!ready || refreshed.current || !items.length) return;
    refreshed.current = true;
    const ids = items.map((i) => i.productId).join(",");
    fetch(`/api/products/live?ids=${encodeURIComponent(ids)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { products: WishItem[] } | null) => {
        if (!d) return;
        const live = new Map(d.products.map((p) => [p.productId, p]));
        setItems((prev) => prev.filter((i) => live.has(i.productId)).map((i) => ({ ...i, ...live.get(i.productId)! })));
      })
      .catch(() => {});
  }, [ready, items]);

  const has = useCallback((id: string) => items.some((i) => i.productId === id), [items]);
  const remove = useCallback((id: string) => setItems((p) => p.filter((i) => i.productId !== id)), []);
  const save = useCallback((item: WishItem) => setItems((p) => (p.some((i) => i.productId === item.productId) ? p : [item, ...p])), []);
  const toggle = useCallback(
    (item: WishItem) => {
      const on = !items.some((i) => i.productId === item.productId);
      setItems((p) => (on ? [item, ...p] : p.filter((i) => i.productId !== item.productId)));
      return on;
    },
    [items],
  );

  const value = useMemo(() => ({ items, ready, has, toggle, save, remove }), [items, ready, has, toggle, save, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
