import { listShopProducts } from "@/lib/db";
import { handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { searchProducts } from "@/lib/search";

// Per-request data (query string, rate limit by IP): never prerender at build time.
export const dynamic = "force-dynamic";

/** Instant search suggestions: GET /api/search?q=gold+ring → top matches at live (sale) prices. */
export const GET = handler(async (req: Request) => {
  await rateLimit(`search:ip:${await clientIp()}`, 120, 60);
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 100);
  if (q.trim().length < 2) return { query: q, total: 0, results: [] };
  const { results, corrected } = searchProducts(await listShopProducts(), q);
  return {
    query: q,
    corrected,
    total: results.length,
    results: results.slice(0, 6).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      image: p.images[0],
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      category: p.category,
      metal: p.metal,
      soldOut: p.stock === 0,
      sale: p.sale?.name,
    })),
  };
});
