import { requireAdmin } from "@/lib/auth";
import { prisma, toSale, uid } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { saleSchema } from "@/lib/schemas";

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const input = saleSchema.parse(await req.json());
  if (input.endsAt <= new Date()) throw new HttpError(400, "endsAt: The end date is already in the past.");
  if (input.scope === "products") {
    const found = await prisma.product.count({ where: { id: { in: input.productIds } } });
    if (found !== input.productIds.length) throw new HttpError(400, "Some selected products no longer exist.");
  }
  const row = await prisma.sale.create({
    data: { ...input, id: uid("s"), categories: input.scope === "categories" ? input.categories : [], productIds: input.scope === "products" ? input.productIds : [] },
  });
  return { sale: toSale(row) };
});
