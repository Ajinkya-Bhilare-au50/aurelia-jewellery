"use client";

import Image from "@/components/Img";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FREE_SHIPPING_MIN, SHIPPING_FEE } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { useCart, type CartLine } from "./CartProvider";
import { BagIcon, CloseIcon } from "./Icons";
import { QtyStepper } from "./QtyStepper";
import { useWishlist } from "./WishlistProvider";

export function CartDrawer() {
  const { lines, drawerOpen, setDrawerOpen, setQty, remove, subtotal, count } = useCart();
  const { save } = useWishlist();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [drawerOpen, setDrawerOpen]);

  const saveForLater = (l: CartLine) => {
    save({ productId: l.productId, slug: l.slug, name: l.name, image: l.image, price: l.price, metal: l.metal ?? "", category: l.category ?? (l.size ? "rings" : "necklaces"), stock: l.maxQty });
    remove(l.key);
  };

  const remaining = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100);
  const t = drawerOpen ? 0 : -1;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
      <div className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawerOpen(false)} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-border bg-surface-elevated transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0 shadow-2xl shadow-black" : "translate-x-full"}`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5 md:px-6">
          <h2 className="font-display text-[26px]">Your bag <span className="text-muted">({count})</span></h2>
          <button ref={closeRef} tabIndex={t} aria-label="Close bag" onClick={() => setDrawerOpen(false)} className="icon-btn -mr-3 text-secondary"><CloseIcon /></button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <BagIcon width={36} height={36} className="text-gold" />
            <p className="font-display text-[28px]">Your bag is empty</p>
            <p className="text-secondary">Discover pieces made to be treasured.</p>
            <Link href="/shop" tabIndex={t} className="btn-primary mt-2" onClick={() => setDrawerOpen(false)}>Explore the collection</Link>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-border px-5 py-4 md:px-6">
              <p className="text-[13px] text-secondary">
                {remaining > 0 ? <>Add <strong className="font-medium text-gold">{formatINR(remaining)}</strong> for free insured shipping</> : <span className="text-success">You&apos;ve unlocked free insured shipping</span>}
              </p>
              <div className="mt-2 h-[2px] w-full bg-border" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Free shipping progress">
                <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5 md:px-6">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-4 py-5">
                  <Link href={`/product/${l.slug}`} tabIndex={t} onClick={() => setDrawerOpen(false)} className="relative h-[112px] w-[90px] shrink-0 overflow-hidden bg-surface">
                    <Image src={l.image} alt={l.name} fill sizes="90px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/product/${l.slug}`} tabIndex={t} onClick={() => setDrawerOpen(false)} className="text-[15px] font-medium leading-snug hover:text-gold-hover">{l.name}</Link>
                      <p className="shrink-0 text-sm text-gold tabular-nums">{formatINR(l.price * l.qty)}</p>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">{[l.metal, l.size && `Size ${l.size}`].filter(Boolean).join(" · ") || `${formatINR(l.price)} each`}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <QtyStepper small value={l.qty} max={l.maxQty} onChange={(n) => setQty(l.key, n)} />
                      <div className="flex gap-3 text-[12px] text-secondary">
                        <button tabIndex={t} onClick={() => saveForLater(l)} className="underline decoration-border underline-offset-4 hover:text-ivory">Save for later</button>
                        <button tabIndex={t} onClick={() => remove(l.key)} className="underline decoration-border underline-offset-4 hover:text-ivory">Remove</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="shrink-0 border-t border-border bg-surface-elevated px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 md:px-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between text-secondary"><dt>Subtotal</dt><dd className="tabular-nums">{formatINR(subtotal)}</dd></div>
                <div className="flex justify-between text-secondary"><dt>Coupons &amp; rewards</dt><dd>At checkout</dd></div>
                <div className="flex items-baseline justify-between border-t border-border pt-3"><dt className="label !text-ivory">Estimated total</dt><dd className="font-display text-[28px] tabular-nums">{formatINR(subtotal + (remaining > 0 ? SHIPPING_FEE : 0))}</dd></div>
              </dl>
              <p className="mt-1 text-[12px] text-muted">Inclusive of GST. Final total confirmed at checkout.</p>
              <div className="mt-4 grid gap-2">
                <Link href="/checkout" tabIndex={t} className="btn-primary w-full" onClick={() => setDrawerOpen(false)}>Checkout securely</Link>
                <Link href="/cart" tabIndex={t} className="btn-secondary w-full" onClick={() => setDrawerOpen(false)}>View bag</Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
