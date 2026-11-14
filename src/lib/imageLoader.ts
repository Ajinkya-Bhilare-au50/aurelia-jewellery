"use client";

/**
 * next/image loader: let the Unsplash (imgix) CDN resize/encode images instead of the Next.js server.
 * Images come straight from a global CDN at the exact width needed, in WebP/AVIF, with no server work.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // Admin-uploaded photos: our own route resizes them (and the CDN caches each width).
  if (src.startsWith("/api/images/")) return `${src}?w=${width}`;
  if (!src.startsWith("https://images.unsplash.com/")) return src;
  const url = new URL(src);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", url.searchParams.get("fit") ?? "crop");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 70));
  return url.toString();
}
