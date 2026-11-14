import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma, toCoupon } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";

type Ctx = { params: { id: string } };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { active } = z.object({ active: z.boolean() }).parse(await req.json());
  const res = await prisma.coupon.updateMany({ where: { id: params.id }, data: { active } });
  if (!res.count) throw new HttpError(404, "Coupon not found.");
  return { coupon: toCoupon((await prisma.coupon.findUnique({ where: { id: params.id } }))!) };
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const res = await prisma.coupon.deleteMany({ where: { id: params.id } });
  if (!res.count) throw new HttpError(404, "Coupon not found.");
  return { ok: true };
});
