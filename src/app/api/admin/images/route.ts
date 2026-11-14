import { randomBytes } from "crypto";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { UPLOADED_PREFIX, UPLOAD_MAX_BYTES, UPLOAD_MAX_PX } from "@/lib/productImageUrl";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Upload a product photo (admin only; the read-only demo admin is refused by requireAdmin).
 * The file is decoded and re-encoded with sharp: rotated upright, capped at UPLOAD_MAX_PX,
 * converted to WebP and stripped of metadata (EXIF / GPS). Returns the URL to put in Product.images.
 */
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin();
  await rateLimit(`image-upload:${admin.id}`, 60, 3600);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload.");
  if (file.size > UPLOAD_MAX_BYTES) throw new HttpError(413, "That image is too large (max 4 MB).");

  const input = Buffer.from(await file.arrayBuffer());
  const out = await (async () => {
    const meta = await sharp(input).metadata();
    if (!meta.format || !["jpeg", "png", "webp", "avif", "heif"].includes(meta.format)) throw new Error("format");
    return sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // honour EXIF orientation, then metadata is dropped
      .resize({ width: UPLOAD_MAX_PX, height: UPLOAD_MAX_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
  })().catch(() => {
    throw new HttpError(400, "That file isn't a valid JPG, PNG, WebP or AVIF image.");
  });

  const id = `img_${randomBytes(12).toString("hex")}`;
  await prisma.productImage.create({ data: { id, data: out.data, mimeType: "image/webp", width: out.info.width, height: out.info.height } });
  return { url: `${UPLOADED_PREFIX}${id}`, width: out.info.width, height: out.info.height, bytes: out.data.length };
});
