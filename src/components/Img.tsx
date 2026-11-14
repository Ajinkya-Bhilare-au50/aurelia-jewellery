"use client";

import Image, { type ImageProps } from "next/image";
import imageLoader from "@/lib/imageLoader";

/**
 * Drop-in replacement for next/image that lets the Unsplash CDN (or our image route) resize images.
 * Passing `loader` per image (instead of `images.loaderFile`) keeps Turbopack dev mode working.
 * (A blurred-preview background was tried and measured: the extra early requests made the main
 * photo ~150 ms slower on 4G, so slots just show the surface colour until the photo arrives.)
 */
export default function Img({ alt, ...props }: ImageProps) {
  return <Image loader={imageLoader} alt={alt} {...props} />;
}
