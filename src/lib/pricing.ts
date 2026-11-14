import "server-only";
import { z } from "zod";
import { getLiveSales, prisma, toCoupon, toProduct, type Tx } from "./db";
import { applySales } from "./sales";
import { HttpError } from "./http";
import type { Coupon, OrderItem, User } from "./types";

import { FREE_SHIPPING_MIN, REFERRAL_MAX, REFERRAL_PERCENT, RING_SIZES, SHIPPING_FEE } from "./constants";

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(10),
  size: z.string().max(4).optional(),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export interface Quote {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  couponCode?: string;
  couponError?: string;
  referralApplied: boolean;
  shipping: number;
  total: number;
}

export function couponDiscount(c: Coupon, subtotal: number) {
  const raw = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
  return Math.min(raw, c.maxDiscount ?? Infinity, subtotal);
}

/** Returns an error message, or null when the coupon can be used. */
export function couponProblem(c: Coupon | undefined, subtotal: number, user: User | null): string | null {
  if (!c || !c.active) return "This coupon code is not valid.";
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return "This coupon has expired.";
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "This coupon has been fully redeemed.";
  if (c.ownerId && c.ownerId !== user?.id) return "This coupon belongs to another account.";
  if (subtotal < c.minOrder) return `Add items worth ₹${(c.minOrder - subtotal).toLocaleString("en-IN")} more to use this coupon.`;
  return null;
}

/** First-order referral discount: referred user with no paid (non-cancelled) order yet. */
export async function referralEligible(user: User | null, db: Tx | typeof prisma = prisma) {
  if (!user?.referredBy || user.referralDiscountUsed) return false;
  const paid = await db.order.count({ where: { userId: user.id, status: { notIn: ["pending_payment", "cancelled"] } } });
  return paid === 0;
}

/** Server-authoritative pricing for a cart. Throws for unknown / unavailable products. */
export async function quote(lines: CartLineInput[], opts: { couponCode?: string; user: User | null }, db: Tx | typeof prisma = prisma): Promise<Quote> {
  if (!lines.length) throw new HttpError(400, "Your bag is empty.");

  const code = opts.couponCode?.trim().toUpperCase();
  const [rows, couponRow, referral] = await Promise.all([
    db.product.findMany({ where: { id: { in: [...new Set(lines.map((l) => l.productId))] } } }),
    code ? db.coupon.findUnique({ where: { code } }) : null,
    referralEligible(opts.user, db),
  ]);
  const live = await getLiveSales();
  const products = new Map(rows.map((r) => [r.id, applySales(toProduct(r), live)])); // live sale prices, server-side

  const items: OrderItem[] = lines.map((l) => {
    const p = products.get(l.productId);
    if (!p) throw new HttpError(400, "A product in your bag is no longer available.");
    if (p.stock < l.qty) throw new HttpError(409, p.stock === 0 ? `${p.name} is sold out.` : `Only ${p.stock} of ${p.name} left in stock.`);
    if (p.category === "rings" && (!l.size || !RING_SIZES.includes(l.size))) throw new HttpError(400, `Please choose a ring size for ${p.name}.`);
    return {
      productId: p.id, name: p.name, slug: p.slug, image: p.images[0], price: p.price, qty: l.qty, size: p.category === "rings" ? l.size : undefined,
      ...(p.sale ? { listPrice: p.sale.regularPrice, saleName: p.sale.name } : {}),
    };
  });

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  let discount = 0;
  let discountLabel: string | undefined;
  let couponCode: string | undefined;
  let couponError: string | undefined;
  let referralApplied = false;

  if (referral) {
    discount = Math.min(Math.round((subtotal * REFERRAL_PERCENT) / 100), REFERRAL_MAX);
    discountLabel = `Referral welcome (${REFERRAL_PERCENT}% off)`;
    referralApplied = true;
  }

  if (code) {
    const c = couponRow ? toCoupon(couponRow) : undefined;
    const noStack = [...products.values()].find((p) => p.sale && !p.sale.stackWithCoupons && items.some((i) => i.productId === p.id));
    const problem = noStack ? `Coupons can't be combined with the ${noStack.sale!.name} prices.` : couponProblem(c, subtotal, opts.user);
    if (problem) couponError = problem;
    else if (c) {
      const d = couponDiscount(c, subtotal);
      if (d >= discount) {
        discount = d;
        discountLabel = `Coupon ${c.code}`;
        couponCode = c.code;
        referralApplied = false;
      } else {
        couponError = "Your referral discount is better than this coupon, so we kept it.";
      }
    }
  }

  const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  return { items, subtotal, discount, discountLabel, couponCode, couponError, referralApplied, shipping, total: subtotal - discount + shipping };
}
