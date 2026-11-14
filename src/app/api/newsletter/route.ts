import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254) });

/** Newsletter sign-up. Idempotent: subscribing twice is not an error (and doesn't reveal who's subscribed). */
export const POST = handler(async (req: Request) => {
  await rateLimit(`newsletter:ip:${await clientIp()}`, 10, 3600);
  const { email } = schema.parse(await req.json());
  await prisma.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  return { ok: true };
});
