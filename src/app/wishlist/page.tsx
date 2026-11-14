"use client";

import Image from "@/components/Img";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { HeartIcon } from "@/components/Icons";
import { useWishlist } from "@/components/WishlistProvider";
import { formatINR } from "@/lib/format";

export default function WishlistPage() {
  const { items, ready, remove } = useWishlist();
  const { add } = useCart();

  return (
    <div className="container-page py-12 lg:py-16">
      <p className="label !text-gold">Saved for later</p>
      <h1 className="h-page mt-4">Wishlist</h1>

      {!ready ? (
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[4/5]" />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center border border-dashed border-border px-6 py-20 text-center">
          <HeartIcon width={32} height={32} className="text-gold" />
          <p className="h-section mt-6">Nothing saved yet</p>
          <p className="mt-3 max-w-sm text-secondary">Tap the heart on any piece to keep it here while you decide.</p>
          <Link href="/shop" className="btn-primary mt-8">Explore the collection</Link>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {items.map((i) => (
            <li key={i.productId} className="flex flex-col">
              <Link href={`/product/${i.slug}`} className="relative aspect-[4/5] overflow-hidden bg-surface">
                <Image src={i.image} alt={i.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
              </Link>
              <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted">{i.metal}</p>
              <Link href={`/product/${i.slug}`} className="mt-1 text-[15px] font-medium hover:text-gold-hover md:text-base">{i.name}</Link>
              <p className="mt-1 text-gold tabular-nums">{formatINR(i.price)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {i.stock === 0 ? (
                  <span className="text-[12px] text-muted">Sold out</span>
                ) : i.category === "rings" ? (
                  <Link href={`/product/${i.slug}`} className="btn-secondary btn-sm">Choose size</Link>
                ) : (
                  <button className="btn-secondary btn-sm" onClick={() => { add({ productId: i.productId, slug: i.slug, name: i.name, image: i.image, price: i.price, maxQty: i.stock, metal: i.metal, category: i.category }); remove(i.productId); }}>Move to bag</button>
                )}
                <button onClick={() => remove(i.productId)} className="text-[12px] text-secondary underline underline-offset-4 hover:text-ivory">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
