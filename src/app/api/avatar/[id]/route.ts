import { prisma } from "@/lib/db";

/** Serves a profile photo. URLs carry ?v=<updatedAt>, so responses can be cached immutably. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await prisma.userAvatar.findUnique({ where: { userId: params.id } });
  if (!a) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(a.data, {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(a.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
