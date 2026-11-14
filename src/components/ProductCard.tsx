import Image from "@/components/Img";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { WishlistButton } from "./WishlistButton";

const NEW_DAYS = 10;

export function ProductCard({ product: p, priority }: { product: Product; priority?: boolean }) {
  const off = p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  const isNew = Date.now() - new Date(p.createdAt).getTime() < NEW_DAYS * 864e5;
  // One label max, in order of importance (only when accurate).
  const label = p.stock === 0 ? ["Sold out", "bg-surface-elevated text-secondary"] : p.sale ? [p.sale.name, "bg-gold text-background"] : p.stock <= 3 ? ["Limited", "bg-background/80 text-gold"] : p.featured ? ["Bestseller", "bg-background/80 text-ivory"] : isNew ? ["New", "bg-background/80 text-ivory"] : null;

  return (
    <article className="group relative flex flex-col">
      <Link href={`/product/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-surface" aria-label={p.name}>
        <Image
          src={p.images[0]}
          alt={p.name}
          fill
          priority={priority}
          sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw"
          className={`object-cover transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.03] ${p.images[1] ? "group-hover:opacity-0" : ""} ${p.stock === 0 ? "opacity-50" : ""}`}
        />
        {p.images[1] && <Image src={p.images[1]} alt="" fill sizes="(min-width:1280px) 22vw, 50vw" className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
        {label && <span className={`badge absolute left-3 top-3 backdrop-blur ${label[1]}`}>{label[0]}</span>}
      </Link>
      <WishlistButton
        item={{ productId: p.id, slug: p.slug, name: p.name, image: p.images[0], price: p.price, metal: p.metal, category: p.category, stock: p.stock }}
        className="absolute right-2 top-2 h-10 w-10 rounded-full bg-background/60 backdrop-blur"
      />
      <div className="mt-4 flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{p.metal} · {p.purity}</p>
        <h3 className="text-[15px] font-medium leading-snug text-ivory md:text-base">
          <Link href={`/product/${p.slug}`} className="transition-colors hover:text-gold-hover">{p.name}</Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 text-[14px] tabular-nums md:text-[15px]">
          <span className="text-gold">{formatINR(p.price)}</span>
          {p.compareAtPrice && <span className="text-[13px] text-muted line-through">{formatINR(p.compareAtPrice)}</span>}
          {off > 0 && p.stock > 0 && <span className="text-[12px] text-success">{off}% off</span>}
        </p>
      </div>
    </article>
  );
}
