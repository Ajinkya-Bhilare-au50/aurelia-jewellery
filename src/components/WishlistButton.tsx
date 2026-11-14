"use client";

import { useState } from "react";
import { HeartIcon } from "./Icons";
import { useWishlist, type WishItem } from "./WishlistProvider";

export function WishlistButton({ item, className = "", withLabel }: { item: WishItem; className?: string; withLabel?: boolean }) {
  const { has, toggle, ready } = useWishlist();
  const [pulse, setPulse] = useState(false);
  const on = ready && has(item.productId);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (toggle(item)) {
          setPulse(true);
          setTimeout(() => setPulse(false), 450);
        }
      }}
      className={`inline-flex items-center justify-center gap-2 transition-colors ${on ? "text-gold" : "text-ivory hover:text-gold-hover"} ${className}`}
    >
      <HeartIcon filled={on} className={`transition-transform duration-300 ${pulse ? "scale-125" : "scale-100"}`} />
      {withLabel && <span>{on ? "Saved" : "Wishlist"}</span>}
      <span className="sr-only" aria-live="polite">{on ? "Saved to wishlist" : ""}</span>
    </button>
  );
}
