import { avatarColor, initials } from "@/lib/avatar";

const SIZES = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-9 w-9 text-[13px]",
  md: "h-12 w-12 text-[16px]",
  lg: "h-20 w-20 text-[26px]",
  xl: "h-28 w-28 text-[36px]",
} as const;

/**
 * Profile picture: the uploaded photo when there is one, otherwise the user's initials
 * on a colour derived from their id (stable across renames, different per user).
 */
export function Avatar({
  name,
  id,
  src,
  size = "sm",
  className = "",
}: {
  name: string;
  id?: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = `relative inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full ${SIZES[size]} ${className}`;
  if (src) {
    return (
      <span className={`${base} bg-surface-muted`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own API, not the Unsplash loader */}
        <img src={src} alt={name} width={256} height={256} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span role="img" aria-label={name} className={`${base} ${avatarColor(id || name)} font-sans font-semibold tracking-wide text-white`}>
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
}
