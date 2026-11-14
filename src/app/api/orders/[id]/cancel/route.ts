import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { CANCEL_REASONS } from "@/lib/cancellation";
import { handler } from "@/lib/http";
import { cancelOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  reason: z.enum(CANCEL_REASONS),
  note: z.string().trim().max(200).optional(),
  // Omit `lines` to cancel the whole order.
  lines: z.array(z.object({ index: z.number().int().min(0).max(49), qty: z.number().int().min(1).max(10) })).min(1).max(50).optional(),
});

/** Customer cancels their own order (or some items of it) before it ships. */
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  await rateLimit(`cancel:${user.id}`, 20, 3600);
  const { reason, note, lines } = schema.parse(await req.json());
  const order = await cancelOrder({
    orderId: params.id,
    by: user.role === "admin" ? "admin" : "customer",
    userId: user.role === "admin" ? undefined : user.id, // customers can only cancel their own orders
    lines,
    reason: reason === "Other" && note ? `Other: ${note}` : reason,
  });
  const refund = order.refunds.at(-1);
  return { status: order.status, refund: refund ? { amount: refund.amount, status: refund.status } : null };
});
