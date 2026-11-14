"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import imageLoader from "@/lib/imageLoader";

/** A tiny (<1 KB) blurred version of the photo, shown until the real one has loaded. */
export function previewSrc(src: string): string | undefined {
  if (src.startsWith("https://images.unsplash.com/")) {
    const u = new URL(src);
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", u.searchParams.get("fit") ?? "crop");
    u.searchParams.set("w", "32");
    u.searchParams.set("q", "30");
    u.searchParams.set("blur", "60");
    return u.toString();
  }
  if (src.startsWith("/api/images/")) return `${src}?w=64`;
  return undefined;
}

/**
 * Drop-in replacement for next/image that lets the Unsplash CDN (or our image route) resize images.
 * Passing `loader` per image (instead of `images.loaderFile`) keeps Turbopack dev mode working.
 * Shows a blurred preview of the photo while the full image loads (`preview={false}` to skip).
 */
export default function Img({ alt, preview = true, onLoad, style, ...props }: ImageProps & { preview?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const tiny = preview && !loaded && typeof props.src === "string" ? previewSrc(props.src) : undefined;
  return (
    <Image
      loader={imageLoader}
      alt={alt}
      {...props}
      style={tiny ? { ...style, backgroundImage: `url("${tiny}")`, backgroundSize: "cover", backgroundPosition: "center" } : style}
      onLoad={(e) => {
        setLoaded(true); // drop the preview so it never shows through transparent PNGs
        onLoad?.(e);
      }}
    />
  );
}
