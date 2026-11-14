import { prisma, toProduct, withSales } from "@/lib/db";
import { handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// Per-request data (query string, rate limit by IP): never prerender at build time.
export const dynamic = "force-dynamic";

/** Live price / stock for a few products (wishlist refresh). GET /api/products/live?ids=p_001,p_002 */
export const GET = handler(async (req: Request) => {
  await rateLimit(`live:ip:${await clientIp()}`, 60, 60);
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  if (!ids.length) return { products: [] };
  const rows = await prisma.product.findMany({ where: { id: { in: ids } } });
  const products = await withSales(rows.map(toProduct));
  return {
    products: products.map((p) => ({ productId: p.id, slug: p.slug, name: p.name, image: p.images[0], price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock, metal: p.metal, category: p.category })),
  };
});
