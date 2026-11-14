import { z } from "zod";
import { getUser } from "@/lib/auth";
import { handler } from "@/lib/http";
import { cartLineSchema, quote } from "@/lib/pricing";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({ lines: z.array(cartLineSchema).max(50), couponCode: z.string().max(40).optional() });

/** Server-side price preview for the cart / checkout (coupon + referral aware). */
export const POST = handler(async (req: Request) => {
  await rateLimit(`quote:ip:${await clientIp()}`, 120, 60);
  const { lines, couponCode } = schema.parse(await req.json());
  const user = await getUser();
  return quote(lines, { couponCode, user });
});
