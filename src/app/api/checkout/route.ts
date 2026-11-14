import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { nextCounter, prisma, toOrder, uid } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { cartLineSchema, quote } from "@/lib/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { createRazorpayOrder, demoPaymentsAllowed, razorpayEnabled, razorpayKeyId } from "@/lib/razorpay";

const schema = z.object({
  lines: z.array(cartLineSchema).min(1).max(50),
  couponCode: z.string().max(40).optional(),
  address: z.object({
    name: z.string().trim().min(2, "Enter the recipient's name").max(60),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    line1: z.string().trim().min(3, "Enter your address").max(120),
    line2: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2, "Enter your city").max(60),
    state: z.string().trim().min(2, "Choose your state").max(60),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  }),
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
