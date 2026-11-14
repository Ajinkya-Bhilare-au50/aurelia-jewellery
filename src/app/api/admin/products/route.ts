import { requireAdmin } from "@/lib/auth";
import { prisma, toProduct, uid } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { productSchema } from "@/lib/schemas";

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const input = productSchema.parse(await req.json());
  if (await prisma.product.findUnique({ where: { slug: input.slug }, select: { id: true } })) throw new HttpError(409, "A product with this slug already exists.");
  const row = await prisma.product.create({ data: { ...input, id: uid("p") } });
  return { product: toProduct(row) };
});
