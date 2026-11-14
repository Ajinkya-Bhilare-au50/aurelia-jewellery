// Shared by client and server. Keep free of server-only imports.

/** Uploaded product photos live at /api/images/<id>; everything else is an Unsplash URL. */
export const UPLOADED_PREFIX = "/api/images/";
export const UPLOADED_RE = /^\/api\/images\/img_[a-z0-9]{10,40}$/;
export const isUploadedImage = (src: string) => src.startsWith(UPLOADED_PREFIX);

/** Widths the image route will produce (next.config deviceSizes + imageSizes). */
export const IMAGE_WIDTHS = [64, 96, 128, 256, 384, 390, 640, 828, 1080, 1280, 1600, 1920] as const;
/** Snap a requested width to the nearest allowed one at or above it (keeps the CDN cache small). */
export const snapWidth = (w: number) => IMAGE_WIDTHS.find((x) => x >= w) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

/** Longest side kept on upload, and the largest file the browser may send (after its own downscale). */
export const UPLOAD_MAX_PX = 2000;
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
