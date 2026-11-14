import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await prisma.product.findMany({ select: { slug: true, createdAt: true } });
  const pages = ["", "/shop", "/track", "/contact", "/terms", "/privacy", "/refund-policy", "/shipping-policy"];
  const categories = ["rings", "necklaces", "earrings", "bracelets"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...categories.map((c) => ({ url: `${base}/shop?category=${c}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
