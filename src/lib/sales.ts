// Sale maths. Pure and shared by client (admin preview) and server (authoritative pricing).
import type { Product, Sale } from "./types";

export type SaleState = "scheduled" | "live" | "ended" | "paused";

export function saleState(s: Pick<Sale, "active" | "startsAt" | "endsAt">, now = Date.now()): SaleState {
  if (new Date(s.endsAt).getTime() <= now) return "ended";
  if (!s.active) return "paused";
  return new Date(s.startsAt).getTime() > now ? "scheduled" : "live";
}

export const saleApplies = (s: Sale, p: Pick<Product, "id" | "category">) =>
  s.scope === "all" || (s.scope === "categories" ? s.categories.includes(p.category) : s.productIds.includes(p.id));

/** Price after one sale (whole rupees, never below ₹1). */
export function salePrice(s: Pick<Sale, "type" | "value">, price: number) {
  const off = s.type === "percent" ? Math.round((price * s.value) / 100) : s.value;
  return Math.max(1, price - off);
}

/**
 * Apply the best live sale to a product. `price` becomes the sale price and `compareAtPrice`
 * the higher of the regular price and any existing compare-at price, so strike-through prices,
 * "% off" badges and the "On sale" filter work everywhere unchanged.
 */
export function applySales<P extends Product>(p: P, live: Sale[]): P {
  let best: Sale | null = null;
  let bestPrice = p.price;
  for (const s of live) {
    if (!saleApplies(s, p)) continue;
    const sp = salePrice(s, p.price);
    if (sp < bestPrice) {
      best = s;
      bestPrice = sp;
    }
  }
  if (!best) return p;
  return {
    ...p,
    price: bestPrice,
    compareAtPrice: Math.max(p.compareAtPrice ?? 0, p.price),
    sale: { id: best.id, name: best.name, regularPrice: p.price, stackWithCoupons: best.stackWithCoupons, endsAt: best.endsAt },
  };
}

export const describeSale = (s: Pick<Sale, "type" | "value">) => (s.type === "percent" ? `${s.value}% off` : `₹${s.value.toLocaleString("en-IN")} off`);
