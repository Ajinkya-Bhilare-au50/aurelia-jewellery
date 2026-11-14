// Cancellation rules + refund maths. Pure and shared by client (estimate) and server (authoritative).
import type { Order, OrderItem, OrderStatus } from "./types";

export const CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Want a different size or design",
  "Other",
] as const;

/** The whole order can be cancelled until it ships. */
export const ORDER_CANCELLABLE: OrderStatus[] = ["pending_payment", "confirmed", "packed"];
/** Individual items can be cancelled on paid orders that haven't shipped. */
export const ITEMS_CANCELLABLE: OrderStatus[] = ["confirmed", "packed"];

export const activeQty = (i: OrderItem) => i.qty - (i.cancelledQty ?? 0);
export const activeUnits = (o: Pick<Order, "items">) => o.items.reduce((n, i) => n + activeQty(i), 0);
export const isPaid = (o: Pick<Order, "status">) => o.status !== "pending_payment" && o.status !== "cancelled";

export type CancelLine = { index: number; qty: number };

/**
 * Refund for cancelling some units. Each unit's share of what was actually paid for goods
 * (subtotal − discount), so coupon / referral discounts are shared out proportionally.
 * Shipping is only refunded when the whole order is cancelled.
 */
export function itemsRefund(o: Pick<Order, "items" | "subtotal" | "discount">, lines: CancelLine[]) {
  if (o.subtotal <= 0) return 0;
  const paidForGoods = o.subtotal - o.discount;
  const value = lines.reduce((s, l) => s + o.items[l.index].price * l.qty, 0);
  return Math.floor((value * paidForGoods) / o.subtotal); // floor: never over-refund on rounding
}

/** Full cancellation refunds whatever has not been refunded yet (goods + shipping). */
export const remainingRefund = (o: Pick<Order, "total" | "refundedAmount" | "status">) => (isPaid(o) ? Math.max(0, o.total - o.refundedAmount) : 0);

/** Validates a cancellation request; returns an error message or null. */
export function cancelProblem(o: Pick<Order, "status" | "items">, lines?: CancelLine[]): string | null {
  if (o.status === "cancelled") return "This order is already cancelled.";
  if (!ORDER_CANCELLABLE.includes(o.status)) return "This order has already shipped, so it can't be cancelled. You can request a return after delivery.";
  if (!lines) return null;
  if (!ITEMS_CANCELLABLE.includes(o.status)) return "Items can only be cancelled after payment. Cancel the whole order instead.";
  if (!lines.length) return "Choose at least one item to cancel.";
  const seen = new Set<number>();
  for (const l of lines) {
    const item = o.items[l.index];
    if (!item || seen.has(l.index)) return "Invalid item selection.";
    seen.add(l.index);
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > activeQty(item)) return `You can cancel up to ${item ? activeQty(item) : 0} of ${item?.name ?? "this item"}.`;
  }
  return null;
}

export const describeLines = (o: Pick<Order, "items">, lines: CancelLine[]) =>
  lines.map((l) => `${l.qty} × ${o.items[l.index].name}${o.items[l.index].size ? ` (size ${o.items[l.index].size})` : ""}`).join(", ");
