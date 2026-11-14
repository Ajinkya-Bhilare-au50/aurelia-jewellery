import { requireAdmin } from "@/lib/auth";
import { handler } from "@/lib/http";
import { retryRefund } from "@/lib/orders";

/** Admin: retry a refund that failed at the payment provider. */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string; refundId: string }> }) => {
  const params = await ctx.params;
  await requireAdmin();
  const order = await retryRefund(params.id, params.refundId);
  return { refund: order.refunds.find((r) => r.id === params.refundId) };
});
