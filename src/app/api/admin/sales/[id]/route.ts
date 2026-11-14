import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma, toSale } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { saleSchema } from "@/lib/schemas";

type Ctx = { params: { id: string } };

// .strict(): a full edit also contains `active`, so quick actions must match ONLY their own field.
const quick = z.union([z.object({ active: z.boolean() }).strict(), z.object({ endNow: z.literal(true) }).strict()]);

/** Full edit (same body as create) or a quick action: { active } (pause/resume) or { endNow: true }. */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const body = await req.json();
  const existing = await prisma.sale.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Sale not found.");

  const q = quick.safeParse(body);
  if (q.success) {
    const data = "endNow" in q.data ? { endsAt: new Date() } : { active: q.data.active };
    return { sale: toSale(await prisma.sale.update({ where: { id: params.id }, data })) };
  }

  const input = saleSchema.parse(body);
  if (input.scope === "products") {
    const found = await prisma.product.count({ where: { id: { in: input.productIds } } });
    if (found !== input.productIds.length) throw new HttpError(400, "Some selected products no longer exist.");
  }
  const row = await prisma.sale.update({
    where: { id: params.id },
    data: { ...input, categories: input.scope === "categories" ? input.categories : [], productIds: input.scope === "products" ? input.productIds : [] },
  });
  return { sale: toSale(row) };
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const res = await prisma.sale.deleteMany({ where: { id: params.id } });
  if (!res.count) throw new HttpError(404, "Sale not found.");
  return { ok: true };
});
