import type { OrderStatus } from "./types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(n);

/** The store's timezone. Servers (e.g. Vercel) run in UTC, so never rely on the machine's zone. */
export const STORE_TZ = "Asia/Kolkata";

export const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: STORE_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

export const STATUS_FLOW: OrderStatus[] = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Order confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const CATEGORY_LABEL = { rings: "Rings", necklaces: "Necklaces", earrings: "Earrings", bracelets: "Bracelets" } as const;

export const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
