// Shared by client and server. Keep free of server-only imports.

/** Full class names so Tailwind keeps them (tokens in tailwind.config.ts → colors.avatar). */
const BG = [
  "bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4", "bg-avatar-5", "bg-avatar-6",
  "bg-avatar-7", "bg-avatar-8", "bg-avatar-9", "bg-avatar-10", "bg-avatar-11", "bg-avatar-12",
] as const;

/** "Ajinkya Bhilare" → "AB", "Ajinkya" → "A", "  " → "?" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  if (!parts.length) return "?";
  const first = [...parts[0]][0];
  const last = parts.length > 1 ? [...parts[parts.length - 1]][0] : "";
  return (first + last).toUpperCase();
}

/** Stable colour per user: hash of the user id (falls back to name), like Microsoft Teams. */
export function avatarColor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return BG[Math.abs(h) % BG.length];
}

/** Public URL of an uploaded profile photo; versioned so browsers can cache it forever. */
export const avatarSrc = (userId: string, updatedAt?: string | Date | null) =>
  updatedAt ? `/api/avatar/${userId}?v=${new Date(updatedAt).getTime()}` : undefined;

export const AVATAR_MAX_BYTES = 200 * 1024;
export const AVATAR_PX = 256;
