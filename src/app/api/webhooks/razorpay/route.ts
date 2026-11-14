import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markPaid, refundLatePayment } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks):
 *   URL:    https://<your-domain>/api/webhooks/razorpay
 *   Secret: same value as RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.captured, order.paid
 * Confirms orders even if the customer closes the browser before the client-side verify call.
 * markPaid is idempotent, so duplicate deliveries / the client verify racing this are safe.
 */
export const dynamic = "force-dynamic";

type Payload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; currency: string; status: string } };
    order?: { entity: { id: string; amount_paid: number } };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: Payload;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.event !== "payment.captured" && body.event !== "order.paid") return NextResponse.json({ ignored: body.event });

  const payment = body.payload.payment?.entity;
  const rzpOrderId = payment?.order_id ?? body.payload.order?.entity.id;
  if (!payment || !rzpOrderId) return NextResponse.json({ ignored: "no payment" });

  const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
  // Unknown order (e.g. created on another environment): ack so Razorpay doesn't retry forever.
  if (!order) return NextResponse.json({ ignored: "unknown order" });

  // Paid after the customer cancelled: give the money back automatically.
  if (order.status === "cancelled") {
    await refundLatePayment(order.id, payment.id, Math.round(payment.amount / 100));
    return NextResponse.json({ ok: true, refunded: true });
  }

  if (payment.currency !== "INR" || payment.amount !== order.total * 100) {
    console.error(`[razorpay webhook] amount mismatch for ${order.number}: got ${payment.amount} ${payment.currency}, expected ${order.total * 100}`);
    return NextResponse.json({ ignored: "amount mismatch" });
  }

  try {
    const { result } = await markPaid(order.id, { provider: "razorpay", razorpayOrderId: rzpOrderId, paymentId: payment.id });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[razorpay webhook] failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // Razorpay will retry
  }
}
