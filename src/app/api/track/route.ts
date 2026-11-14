import { z } from "zod";
import { prisma, toOrder } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  number: z.string().trim().toUpperCase().min(3).max(20),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/** Public order lookup. Returns only tracking info, never address or payment. */
export const POST = handler(async (req: Request) => {
  await rateLimit(`track:ip:${clientIp()}`, 30, 600);
  const { number, email } = schema.parse(await req.json());
  const row = await prisma.order.findFirst({ where: { number, email } });
  if (!row) throw new HttpError(404, "We couldn't find an order with those details.");
  const o = toOrder(row);
  return {
    number: o.number,
    status: o.status,
    timeline: o.timeline,
    courier: o.courier,
    awb: o.awb,
    city: o.address.city,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty })),
  };
});
