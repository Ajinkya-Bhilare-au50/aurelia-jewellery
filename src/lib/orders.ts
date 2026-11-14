import "server-only";
import type { Prisma } from "@prisma/client";
import { activeQty, activeUnits, cancelProblem, describeLines, isPaid, itemsRefund, remainingRefund, type CancelLine } from "./cancellation";
import { prisma, pushTimeline, toOrder, uid } from "./db";
import { sendOrderCancelled, sendOrderConfirmed, sendOrderDelivered, sendOrderShipped } from "./email";
import { formatINR } from "./format";
import { HttpError } from "./http";
import { refundRazorpayPayment } from "./razorpay";
import type { Order, OrderStatus, Refund } from "./types";

export const REFERRER_REWARD = 500;

/**
 * Called once payment is verified. Idempotent: the status flip is a conditional
 * update, so concurrent verify calls can only confirm (and decrement stock) once.
 */
export type PaidResult = { result: "confirmed" | "already" } | { result: "soldout"; items: string[] };

/**
 * Called once payment is verified. Idempotent and race-safe:
 *  - the order row is locked, so concurrent verify / webhook calls confirm it once;
 *  - the product rows are locked and stock re-checked, so two shoppers paying for the last piece
 *    can't both be confirmed. The loser's order is cancelled and refunded in full automatically.
 */
export async function markPaid(orderId: string, payment: Order["payment"]): Promise<PaidResult> {
  const outcome = await prisma.$transaction(async (tx): Promise<PaidResult & { total?: number }> => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const row = await tx.order.findUnique({ where: { id: orderId } });
    if (!row || row.status !== "pending_payment") return { result: "already" };
    const order = toOrder(row);
    const now = new Date().toISOString();

    // Units needed per product (the same product can appear in several sizes).
    const need = new Map<string, number>();
    for (const i of order.items) need.set(i.productId, (need.get(i.productId) ?? 0) + i.qty);
    const ids = [...need.keys()];
    const stockRows = await tx.$queryRaw<{ id: string; stock: number }[]>`SELECT id, stock FROM "Product" WHERE id = ANY(${ids}) FOR UPDATE`;
    const stock = new Map(stockRows.map((r) => [r.id, r.stock]));
    const short = order.items.filter((i) => (stock.get(i.productId) ?? 0) < (need.get(i.productId) ?? 0)).map((i) => i.name);

    if (short.length) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "cancelled",
          paymentProvider: payment.provider,
          razorpayOrderId: payment.razorpayOrderId ?? row.razorpayOrderId,
          timeline: pushTimeline(order.timeline, {
            status: "cancelled",
            title: "Sold out",
            at: now,
            note: `${[...new Set(short)].join(", ")} sold out while your payment was being processed. We're sorry. Your payment is being refunded in full.`,
          }),
        },
      });
      return { result: "soldout", items: [...new Set(short)], total: order.total };
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "confirmed",
        paymentProvider: payment.provider,
        razorpayOrderId: payment.razorpayOrderId ?? row.razorpayOrderId,
        paymentId: payment.paymentId,
        timeline: pushTimeline(order.timeline, { status: "confirmed", at: now, note: "Payment received. Your piece is being prepared." }),
      },
    });

    for (const [id, qty] of need) {
      await tx.product.update({ where: { id }, data: { stock: { decrement: qty } } });
    }

    if (order.couponCode) {
      await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
    }

    if (order.referralApplied) {
      const user = await tx.user.findUnique({ where: { id: order.userId }, include: { referredBy: true } });
      if (user && !user.referralDiscountUsed) {
        await tx.user.update({ where: { id: user.id }, data: { referralDiscountUsed: true } });
        const referrer = user.referredBy;
        if (referrer) {
          await tx.coupon.create({
            data: {
              id: uid("c"),
              code: `THANKS-${referrer.referralCode}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              type: "flat",
              value: REFERRER_REWARD,
              minOrder: 2000,
              usageLimit: 1,
              ownerId: referrer.id,
              expiresAt: new Date(Date.now() + 90 * 864e5),
              description: `Referral reward: ${user.name.split(" ")[0]} placed their first order`,
            },
          });
        }
      }
    }
    return { result: "confirmed" };
  });

  if (outcome.result === "confirmed") {
    const row = await prisma.order.findUnique({ where: { id: orderId } });
    if (row) await sendOrderConfirmed(toOrder(row));
  } else if (outcome.result === "soldout" && payment.paymentId) {
    const refunded = await refundLatePayment(orderId, payment.paymentId, outcome.total!);
    if (refunded) await sendOrderCancelled(refunded, outcome.total!, true);
  }
  return outcome.result === "soldout" ? { result: "soldout", items: outcome.items } : { result: outcome.result };
}

const NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending_payment: ["cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
};

export const allowedNext = (s: OrderStatus) => NEXT[s] ?? [];

export async function advanceStatus(orderId: string, to: OrderStatus, extra: { note?: string; courier?: string; awb?: string }) {
  // Cancelling goes through the cancellation service so paid orders are refunded and stock restored once.
  if (to === "cancelled") return cancelOrder({ orderId, by: "admin", reason: extra.note || "Cancelled by the store" });

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.order.findUnique({ where: { id: orderId } });
    if (!row) throw new HttpError(404, "Order not found.");
    const order = toOrder(row);
    if (!allowedNext(order.status).includes(to)) throw new HttpError(400, `Cannot move order from ${order.status} to ${to}.`);
    if (to === "shipped" && (!extra.courier || !extra.awb)) throw new HttpError(400, "Courier and AWB number are required to mark as shipped.");

    // Conditional on the status we validated against, so two admins can't double-apply.
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: to,
        ...(to === "shipped" ? { courier: extra.courier, awb: extra.awb } : {}),
        timeline: pushTimeline(order.timeline, { status: to, at: new Date().toISOString(), note: extra.note || undefined }),
      },
    });
    if (res.count === 0) throw new HttpError(409, "This order was just updated by someone else. Refresh and try again.");
    return toOrder((await tx.order.findUnique({ where: { id: orderId } }))!);
  });
  if (to === "shipped") await sendOrderShipped(updated);
  if (to === "delivered") await sendOrderDelivered(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Cancellation & refunds
// ---------------------------------------------------------------------------

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/**
 * Cancel a whole order (no `lines`) or some units of some lines.
 * Runs in a transaction with a row lock, so double clicks / concurrent admin actions can't
 * double-refund or double-restock. The money movement happens after commit (see issueRefund).
 */
export async function cancelOrder(input: { orderId: string; by: Refund["by"]; userId?: string; lines?: CancelLine[]; reason: string }) {
  const { orderId, by, userId, reason } = input;
  const now = new Date().toISOString();

  const { order, refund } = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const row = await tx.order.findUnique({ where: { id: orderId } });
    if (!row || (userId && row.userId !== userId)) throw new HttpError(404, "Order not found.");
    const o = toOrder(row);

    // Validate exactly what was asked for FIRST (e.g. reject "cancel 2" when only 1 is left)…
    const problem = cancelProblem(o, input.lines);
    if (problem) throw new HttpError(400, problem);
    // …then treat "every remaining unit" as a full cancellation (refunds shipping too).
    let lines = input.lines;
    if (lines && lines.reduce((n, l) => n + l.qty, 0) >= activeUnits(o)) lines = undefined;

    const full = !lines;
    const paid = isPaid(o);
    const toCancel: CancelLine[] = full ? o.items.map((i, index) => ({ index, qty: activeQty(i) })).filter((l) => l.qty > 0) : lines!;
    const amount = full ? remainingRefund(o) : itemsRefund(o, toCancel);
    const description = full ? "Entire order" : describeLines(o, toCancel);

    const items = o.items.map((i, index) => {
      const c = toCancel.find((l) => l.index === index);
      return c ? { ...i, cancelledQty: (i.cancelledQty ?? 0) + c.qty } : i;
    });

    // Stock was taken when payment was confirmed, so only paid orders give it back.
    if (paid) {
      for (const l of toCancel) {
        await tx.product.updateMany({ where: { id: o.items[l.index].productId }, data: { stock: { increment: l.qty } } });
      }
    }
    // A fully cancelled paid order frees its coupon use.
    if (full && paid && o.couponCode) {
      await tx.coupon.updateMany({ where: { code: o.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }

    const refund: Refund | null =
      amount > 0 ? { id: uid("rf"), amount, status: "pending", reason, scope: full ? "order" : "items", description, by, at: now } : null;

    // Neutral wording: the same note is read by the customer and by staff.
    const who = by === "customer" ? "at the customer's request" : "by the store";
    const what = full ? "Order cancelled" : `Cancelled ${description}`;
    const note = `${what} ${who}. Reason: ${reason}.${refund ? ` Refund of ${formatINR(amount)} initiated.` : ""}`;

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        items: json(items),
        ...(full ? { status: "cancelled" } : {}),
        refundedAmount: { increment: amount },
        refunds: json([...o.refunds, ...(refund ? [refund] : [])]),
        timeline: pushTimeline(o.timeline, { status: full ? "cancelled" : o.status, at: now, note, ...(full ? {} : { title: toCancel.length === 1 && toCancel[0].qty === 1 ? "Item cancelled" : "Items cancelled" }) }),
      },
    });
    return { order: toOrder(updated), refund };
  });

  const final = refund ? await issueRefund(order, refund) : order;
  await sendOrderCancelled(final, refund?.amount ?? 0, !input.lines || final.status === "cancelled");
  return final;
}

/** Sends the money back (Razorpay or demo) and records the outcome on the order. Never throws. */
async function issueRefund(order: Order, refund: Refund): Promise<Order> {
  let patch: Partial<Refund>;
  try {
    if (order.payment.provider === "razorpay" && order.payment.paymentId) {
      const r = await refundRazorpayPayment(order.payment.paymentId, refund.amount, { order: order.number, refund: refund.id });
      patch = { status: "processed", providerRefundId: r.id };
    } else if (order.payment.provider === "demo") {
      patch = { status: "processed", providerRefundId: `demo_rfnd_${Date.now().toString(36)}` };
    } else {
      patch = { status: "failed", error: "No captured payment found to refund." };
    }
  } catch (err) {
    console.error(`[refund] ${order.number} ${refund.id} failed`, err);
    patch = { status: "failed", error: (err as Error).message.slice(0, 200) };
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
    const o = toOrder((await tx.order.findUnique({ where: { id: order.id } }))!);
    const refunds = o.refunds.map((r) => (r.id === refund.id ? { ...r, ...patch } : r));
    const failNote = patch.status === "failed" ? [{ status: o.status, title: "Refund delayed", at: new Date().toISOString(), note: `Refund of ${formatINR(refund.amount)} needs attention: our team will process it manually.` }] : [];
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { refunds: json(refunds), ...(failNote.length ? { timeline: json([...o.timeline, ...failNote]) } : {}) },
    });
    return toOrder(updated);
  });
}

/**
 * A payment captured for an order that was cancelled while awaiting payment (e.g. a slow UPI
 * confirmation after the customer gave up and cancelled). Refund it in full, once.
 */
export async function refundLatePayment(orderId: string, paymentId: string, amountRupees: number) {
  const refund = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const o = toOrder((await tx.order.findUnique({ where: { id: orderId } }))!);
    if (o.status !== "cancelled" || o.payment.paymentId || o.refunds.some((r) => r.description.includes(paymentId))) return null;
    const r: Refund = { id: uid("rf"), amount: amountRupees, status: "pending", reason: "Payment received after the order was cancelled", scope: "order", description: `Late payment ${paymentId}`, by: "system", at: new Date().toISOString() };
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentId,
        refundedAmount: { increment: amountRupees },
        refunds: json([...o.refunds, r]),
        timeline: pushTimeline(o.timeline, { status: "cancelled", title: "Payment refunded", at: r.at, note: `Payment received after cancellation. Full refund of ${formatINR(amountRupees)} initiated.` }),
      },
    });
    return r;
  });
  if (!refund) return null;
  const o = toOrder((await prisma.order.findUnique({ where: { id: orderId } }))!);
  return issueRefund(o, refund);
}

/** Retry a failed refund (admin). */
export async function retryRefund(orderId: string, refundId: string) {
  const row = await prisma.order.findUnique({ where: { id: orderId } });
  if (!row) throw new HttpError(404, "Order not found.");
  const o = toOrder(row);
  const r = o.refunds.find((x) => x.id === refundId);
  if (!r) throw new HttpError(404, "Refund not found.");
  if (r.status !== "failed") throw new HttpError(400, "Only failed refunds can be retried.");
  return issueRefund(o, r);
}
