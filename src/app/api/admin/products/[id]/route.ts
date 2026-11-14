import { requireAdmin } from "@/lib/auth";
import { prisma, toProduct } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { productSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> }; // Next 15: params are async

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  await requireAdmin();
  const input = productSchema.parse(await req.json());
  const clash = await prisma.product.findFirst({ where: { slug: input.slug, id: { not: params.id } }, select: { id: true } });
  if (clash) throw new HttpError(409, "Another product already uses this slug.");
  const res = await prisma.product.updateMany({ where: { id: params.id }, data: { ...input, compareAtPrice: input.compareAtPrice ?? null } });
  if (!res.count) throw new HttpError(404, "Product not found.");
  return { product: toProduct((await prisma.product.findUnique({ where: { id: params.id } }))!) };
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  await requireAdmin();
  const res = await prisma.product.deleteMany({ where: { id: params.id } });
  if (!res.count) throw new HttpError(404, "Product not found.");
  return { ok: true };
});
