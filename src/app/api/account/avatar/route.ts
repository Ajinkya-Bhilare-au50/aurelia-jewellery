import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AVATAR_MAX_BYTES, avatarSrc } from "@/lib/avatar";
import { prisma } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

/** Check real file signature, not just the declared type. */
function sniff(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const schema = z.object({
  // The browser resizes to 256×256 first, so this is small.
  dataUrl: z.string().max(400_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Upload a JPG, PNG or WebP image."),
});

/** Upload / replace the signed-in user's profile photo. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`avatar:${user.id}`, 20, 3600);
  const { dataUrl } = schema.parse(await req.json());
  const data = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (data.length > AVATAR_MAX_BYTES) throw new HttpError(413, "That image is too large. Please choose a smaller photo.");
  const mimeType = sniff(data);
  if (!mimeType) throw new HttpError(400, "That file isn't a valid JPG, PNG or WebP image.");

  const now = new Date();
  await prisma.$transaction([
    prisma.userAvatar.upsert({ where: { userId: user.id }, create: { userId: user.id, data, mimeType }, update: { data, mimeType } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: now } }),
  ]);
  return { avatarUrl: avatarSrc(user.id, now) };
});

/** Remove the photo (initials are shown again). */
export const DELETE = handler(async () => {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: null } }),
  ]);
  return { ok: true };
});
