import sharp from "sharp";
import { prisma } from "@/lib/db";
import { snapWidth } from "@/lib/productImageUrl";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * Serves an uploaded product photo, resized to ?w= (snapped to an allowed width) as WebP.
 * Image ids are random and content never changes, so every variant is cached immutably by the CDN:
 * the database is read roughly once per width, not once per visitor.
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!/^img_[a-z0-9]{10,40}$/.test(id)) return notFound();
  const img = await prisma.productImage.findUnique({ where: { id } });
  if (!img) return notFound();

  const w = Number(new URL(req.url).searchParams.get("w"));
  let body: Buffer = img.data;
  if (w > 0) {
    const width = snapWidth(w);
    if (width < img.width) body = await sharp(img.data).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": img.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
