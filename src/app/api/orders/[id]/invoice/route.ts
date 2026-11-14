import { requireUser } from "@/lib/auth";
import { prisma, toOrder } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { buildInvoicePdf, invoiceAvailable, invoiceNumber } from "@/lib/invoice";
import { maskOrder } from "@/lib/privacy";
import { rateLimit } from "@/lib/rateLimit";
import { isDemoAdmin } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * Download the GST invoice (PDF) for a paid order.
 * Customers: their own orders only. Admins: any order. Read-only demo admin: masked copy.
 */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await rateLimit(`invoice:${user.id}`, 60, 3600);
  const { id } = await ctx.params;
  const staff = user.role === "admin" || isDemoAdmin(user.role);
  const row = await prisma.order.findFirst({ where: { id, ...(staff ? {} : { userId: user.id }) } });
  if (!row) throw new HttpError(404, "Order not found.");
  const order = isDemoAdmin(user.role) ? maskOrder(toOrder(row)) : toOrder(row);
  if (!invoiceAvailable(order)) throw new HttpError(409, "The invoice is available once the order has been paid.");

  const pdf = await buildInvoicePdf(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Aurelia-Invoice-${invoiceNumber(order)}.pdf"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdf.length),
    },
  });
});
