import { z } from "zod";
import { addressSchema, saveAddress } from "@/lib/addresses";
import { requireUser } from "@/lib/auth";
import { nextCounter, prisma, toOrder, uid } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { cartLineSchema, quote } from "@/lib/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { createRazorpayOrder, demoPaymentsAllowed, razorpayEnabled, razorpayKeyId } from "@/lib/razorpay";

const schema = z.object({
  lines: z.array(cartLineSchema).min(1).max(50),
  couponCode: z.string().max(40).optional(),
  address: addressSchema,
  /** add this address to the customer's address book */
  saveAddress: z.boolean().optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!razorpayEnabled() && !demoPaymentsAllowed()) throw new HttpError(503, "Online payments are temporarily unavailable. Please try again shortly.");
  await rateLimit(`checkout:${user.id}`, 20, 3600);
  const input = schema.parse(await req.json());

  const q = await quote(input.lines, { couponCode: input.couponCode, user });
  if (input.couponCode && q.couponError && !q.referralApplied) throw new HttpError(400, q.couponError);

  const order = toOrder(
    await prisma.$transaction(async (tx) => {
      const seq = await nextCounter(tx, "order", 10230);
      const now = new Date();
      return tx.order.create({
        data: {
          id: uid("o"),
          number: `AUR-${seq}`,
          userId: user.id,
          email: user.email,
          items: JSON.parse(JSON.stringify(q.items)),
          address: input.address,
          subtotal: q.subtotal,
          discount: q.discount,
          discountLabel: q.discountLabel,
          couponCode: q.couponCode,
          referralApplied: q.referralApplied,
          shipping: q.shipping,
          total: q.total,
          status: "pending_payment",
          timeline: [{ status: "pending_payment", at: now.toISOString(), note: "Order placed, awaiting payment." }],
          paymentProvider: razorpayEnabled() ? "razorpay" : "demo",
          createdAt: now,
        },
      });
    }),
  );

  if (input.saveAddress) {
    // Best effort: a full address book (or any error) must never block the order.
    await saveAddress(user.id, input.address).catch(() => {});
  }

  if (!user.phone) {
    await prisma.user
      .updateMany({ where: { id: user.id, phone: null }, data: { phone: `+91${input.address.phone}` } })
      .catch(() => {}); // number already on another account: keep it on the order only
  }

  if (!razorpayEnabled()) {
    return { orderId: order.id, number: order.number, amount: order.total, mode: "demo" as const };
  }

  const rzp = await createRazorpayOrder(order.total, order.number);
  await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
  return {
    orderId: order.id,
    number: order.number,
    amount: order.total,
    mode: "razorpay" as const,
    keyId: razorpayKeyId(),
    razorpayOrderId: rzp.id,
    prefill: { name: input.address.name, email: user.email, contact: input.address.phone },
  };
});
