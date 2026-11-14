import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma, toOrder } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { markPaid, refundLatePayment, type PaidResult } from "@/lib/orders";
import { demoPaymentsAllowed, verifyRazorpaySignature } from "@/lib/razorpay";

const schema = z.union([
  z.object({
    orderId: z.string(),
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
  }),
  z.object({ orderId: z.string(), demo: z.literal(true) }),
]);

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = schema.parse(await req.json());

  const row = await prisma.order.findFirst({ where: { id: input.orderId, userId: user.id } });
  if (!row) throw new HttpError(404, "Order not found.");
  const order = toOrder(row);
  // Paid after cancelling: verify it's genuine, then refund it automatically.
  if (order.status === "cancelled" && !("demo" in input) && order.payment.razorpayOrderId === input.razorpay_order_id) {
    if (verifyRazorpaySignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
      await refundLatePayment(order.id, input.razorpay_payment_id, order.total);
    }
    throw new HttpError(409, "This order was cancelled, so your payment is being refunded automatically.");
  }
  if (order.status !== "pending_payment") return { ok: true, orderId: order.id };

  let paid: PaidResult;
  if ("demo" in input) {
    if (!demoPaymentsAllowed()) throw new HttpError(400, "Demo payments are disabled.");
    paid = await markPaid(order.id, { provider: "demo", paymentId: `demo_${Date.now().toString(36)}` });
  } else {
    if (order.payment.razorpayOrderId !== input.razorpay_order_id) throw new HttpError(400, "Payment does not match this order.");
    if (!verifyRazorpaySignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
      throw new HttpError(400, "Payment verification failed. If money was deducted it will be refunded automatically.");
    }
    paid = await markPaid(order.id, { provider: "razorpay", razorpayOrderId: input.razorpay_order_id, paymentId: input.razorpay_payment_id });
  }
  if (paid.result === "soldout") {
    throw new HttpError(409, `Sorry, ${paid.items.join(" and ")} sold out while you were paying. Your payment has been refunded in full.`);
  }
  return { ok: true, orderId: order.id };
});
