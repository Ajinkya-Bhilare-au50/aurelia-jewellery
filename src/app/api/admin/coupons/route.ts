import { requireAdmin } from "@/lib/auth";
import { prisma, toCoupon, uid } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { couponSchema } from "@/lib/schemas";

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const input = couponSchema.parse(await req.json());
  if (await prisma.coupon.findUnique({ where: { code: input.code }, select: { id: true } })) throw new HttpError(409, "A coupon with this code already exists.");
  const row = await prisma.coupon.create({ data: { ...input, id: uid("c") } });
  return { coupon: toCoupon(row) };
});
