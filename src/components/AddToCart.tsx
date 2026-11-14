"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RING_SIZES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useCart } from "./CartProvider";
import { QtyStepper } from "./QtyStepper";
import { WishlistButton } from "./WishlistButton";

export function AddToCart({ product: p }: { product: Product }) {
  const { add, setDrawerOpen } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState<string>();
  const [error, setError] = useState("");
  const [showSticky, setShowSticky] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const sizesRef = useRef<HTMLFieldSetElement>(null);
  const isRing = p.category === "rings";
  const soldOut = p.stock === 0;

  // Mobile: show the sticky bar once the main buttons scroll out of view (§9).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addLine = () => {
    if (isRing && !size) {
      setError("Please select your ring size.");
      sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setError("");
    add({ productId: p.id, slug: p.slug, name: p.name, image: p.images[0], price: p.price, size, maxQty: p.stock, metal: p.metal, category: p.category }, qty);
    return true;
  };

  const buyNow = () => {
    if (!addLine()) return;
    setDrawerOpen(false);
    router.push("/checkout");
  };

  return (
    <div className="space-y-6">
      {isRing && (
        <fieldset ref={sizesRef} aria-describedby={error ? "size-error" : undefined}>
          <div className="flex items-baseline justify-between">
            <legend className="field-label">Ring size (Indian)</legend>
            <span className="text-[12px] text-muted">Free resizing in 30 days</span>
          </div>
          <div className="mt-1 grid grid-cols-7 gap-2">
            {RING_SIZES.map((s) => (
              <button key={s} type="button" onClick={() => { setSize(s); setError(""); }} aria-pressed={size === s}
                className={`h-11 border text-sm transition-colors ${size === s ? "border-gold bg-gold font-semibold text-background" : `bg-surface hover:border-gold ${error ? "border-error" : "border-border"}`}`}>{s}</button>
            ))}
          </div>
          {error && <p id="size-error" role="alert" className="mt-2 text-sm text-error">{error}</p>}
        </fieldset>
      )}

      <div ref={mainRef} className="space-y-3">
        <div className="flex gap-3">
          {!soldOut && <QtyStepper value={qty} max={p.stock} onChange={setQty} />}
          <button onClick={addLine} disabled={soldOut} className="btn-secondary flex-1">{soldOut ? "Sold out" : "Add to bag"}</button>
          <WishlistButton item={{ productId: p.id, slug: p.slug, name: p.name, image: p.images[0], price: p.price, metal: p.metal, category: p.category, stock: p.stock }} className="h-12 w-12 shrink-0 border border-border hover:border-gold" />
        </div>
        {!soldOut && <button onClick={buyNow} className="btn-primary w-full">Buy now</button>}
      </div>

      <p className="flex items-center gap-2 text-[13px] text-secondary">
        <span className={`h-2 w-2 rounded-full ${soldOut ? "bg-error" : p.stock <= 3 ? "bg-warning" : "bg-success"}`} />
        {soldOut ? "Currently unavailable. Restocking soon." : p.stock <= 3 ? `Only ${p.stock} left · ships in 24 hours` : "In stock · ships in 24 hours"}
      </p>

      {/* Mobile sticky add-to-cart */}
      {!soldOut && (
        <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-elevated/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${showSticky ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!showSticky}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ivory">{p.name}</p>
              <p className="text-[13px] text-gold tabular-nums">{formatINR(p.price)}{size && <span className="text-muted"> · Size {size}</span>}</p>
            </div>
            <button onClick={addLine} tabIndex={showSticky ? 0 : -1} className="btn-primary btn-sm h-11 px-5">Add to bag</button>
          </div>
        </div>
      )}
    </div>
  );
}
