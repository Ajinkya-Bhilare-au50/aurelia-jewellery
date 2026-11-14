"use client";

import Image, { type ImageProps } from "next/image";
import imageLoader from "@/lib/imageLoader";

/**
 * Drop-in replacement for next/image that lets the Unsplash CDN resize images.
 * Passing `loader` per image (instead of `images.loaderFile`) keeps Turbopack dev mode working.
 */
export default function Img({ alt, ...props }: ImageProps) {
  return <Image loader={imageLoader} alt={alt} {...props} />;
}
