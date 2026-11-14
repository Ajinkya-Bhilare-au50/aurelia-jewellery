import "server-only";
import { PrismaClient, type Prisma } from "@prisma/client";
import { cache } from "react";
import { avatarSrc } from "./avatar";
import { applySales } from "./sales";
import type { Address, Coupon, Order, OrderItem, OrderStatus, Product, Refund, Sale, TimelineEntry, User } from "./types";

// One client per process; survive dev hot-reloads.
const g = globalThis as unknown as { __prisma?: PrismaClient };
// Interactive transactions (checkout, payment confirmation, cancellations) lock rows and make several
// round-trips. Prisma's defaults (wait 2 s for a connection, 5 s total) are too tight for a hosted DB
// across a network; under a burst they'd fail instead of briefly queueing.
export const prisma = (g.__prisma ??= new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 20_000 } }));

/** Interactive-transaction client type. */
export type Tx = Prisma.TransactionClient;

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const iso = (d: Date) => d.toISOString();
const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

// ---- Row → domain mappers (domain types keep ISO-string dates and optional fields) ----

export function toUser(u: Prisma.UserGetPayload<object>): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: opt(u.phone),
    phoneVerified: Boolean(u.phoneVerifiedAt),
    passwordHash: u.passwordHash,
    role: u.role === "admin" ? "admin" : "customer",
    referralCode: u.referralCode,
    referredBy: opt(u.referredById),
    referralDiscountUsed: u.referralDiscountUsed,
    avatarUrl: avatarSrc(u.id, u.avatarUpdatedAt),
    createdAt: iso(u.createdAt),
  };
}

export function toProduct(p: Prisma.ProductGetPayload<object>): Product {
  return {
    ...p,
    category: p.category as Product["category"],
    metal: p.metal as Product["metal"],
    compareAtPrice: opt(p.compareAtPrice),
    createdAt: iso(p.createdAt),
  };
}

export function toCoupon(c: Prisma.CouponGetPayload<object>): Coupon {
  return {
    ...c,
    type: c.type === "flat" ? "flat" : "percent",
    maxDiscount: opt(c.maxDiscount),
    expiresAt: c.expiresAt ? iso(c.expiresAt) : undefined,
    usageLimit: opt(c.usageLimit),
    ownerId: opt(c.ownerId),
    description: opt(c.description),
    createdAt: iso(c.createdAt),
  };
}

export function toOrder(o: Prisma.OrderGetPayload<object>): Order {
  return {
    id: o.id,
    number: o.number,
    userId: o.userId,
    email: o.email,
    items: o.items as unknown as OrderItem[],
    address: o.address as unknown as Address,
    subtotal: o.subtotal,
    discount: o.discount,
    discountLabel: opt(o.discountLabel),
    couponCode: opt(o.couponCode),
    referralApplied: o.referralApplied,
    shipping: o.shipping,
    total: o.total,
    refundedAmount: o.refundedAmount,
    refunds: (o.refunds ?? []) as unknown as Refund[],
    status: o.status as OrderStatus,
    timeline: o.timeline as unknown as TimelineEntry[],
    payment: {
      provider: o.paymentProvider === "razorpay" ? "razorpay" : "demo",
      razorpayOrderId: opt(o.razorpayOrderId),
      paymentId: opt(o.paymentId),
    },
    courier: opt(o.courier),
    awb: opt(o.awb),
    createdAt: iso(o.createdAt),
  };
}

/** Minimal user fields for showing an avatar next to an order / coupon. */
export const customerSelect = { select: { id: true, name: true, avatarUpdatedAt: true } } as const;
export const toCustomer = (u: { id: string; name: string; avatarUpdatedAt: Date | null }) => ({ id: u.id, name: u.name, avatarUrl: avatarSrc(u.id, u.avatarUpdatedAt) });

/** Whole catalogue (small), in creation order, at REGULAR prices (admin). */
export const listProducts = async () => (await prisma.product.findMany({ orderBy: { createdAt: "asc" } })).map(toProduct);

export function toSale(s: Prisma.SaleGetPayload<object>): Sale {
  return {
    ...s,
    bannerText: opt(s.bannerText),
    type: s.type === "flat" ? "flat" : "percent",
    scope: s.scope === "categories" || s.scope === "products" ? s.scope : "all",
    categories: s.categories as Sale["categories"],
    startsAt: iso(s.startsAt),
    endsAt: iso(s.endsAt),
    createdAt: iso(s.createdAt),
  };
}

/** Sales running right now (deduped per request). */
export const getLiveSales = cache(async (): Promise<Sale[]> => {
  const now = new Date();
  const rows = await prisma.sale.findMany({ where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } }, orderBy: { createdAt: "asc" } });
  return rows.map(toSale);
});

/** Apply live sales to products — use for anything customers see or pay. */
export async function withSales<P extends Product>(products: P[]): Promise<P[]> {
  const live = await getLiveSales();
  return live.length ? products.map((p) => applySales(p, live)) : products;
}

/** Catalogue at the prices customers pay right now. */
export const listShopProducts = async () => withSales(await listProducts());

/** Append a timeline entry (JSON column). */
export const pushTimeline = (timeline: TimelineEntry[], entry: TimelineEntry) =>
  [...timeline, entry] as unknown as Prisma.InputJsonValue;

/** Atomically increment a named counter and return the new value. */
export async function nextCounter(tx: Tx, id: string, start: number) {
  const c = await tx.counter.upsert({ where: { id }, create: { id, value: start + 1 }, update: { value: { increment: 1 } } });
  return c.value;
}
