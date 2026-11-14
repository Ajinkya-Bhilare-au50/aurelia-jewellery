"use client";

import Image from "@/components/Img";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { OrderSummary } from "@/components/OrderSummary";
import { QtyStepper } from "@/components/QtyStepper";
import { useQuote } from "@/components/useQuote";
import { formatINR } from "@/lib/format";

export default function CartPage() {
  const { lines, setQty, remove, ready } = useCart();
  const { quote, error, loading } = useQuote();

  if (!ready) return <div className="container-page min-h-[50vh] py-16" />;

  if (!lines.length)
    return (
      <div className="container-page flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
        <p className="label !text-gold">Your bag</p>
        <h1 className="h-page mt-4">Your bag is empty</h1>
        <p className="mt-3 text-secondary">Discover pieces made to be treasured.</p>
        <Link href="/shop" className="btn-primary mt-10">Shop the collection</Link>
      </div>
    );

  return (
    <div className="container-page py-12 lg:py-16">
      <h1 className="h-display h-page">Your bag</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <div className="hidden grid-cols-[1fr_120px_120px] border-b border-border pb-3 label md:grid">
            <span>Item</span><span className="text-center">Quantity</span><span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-border border-b border-border">
            {lines.map((l) => (
              <li key={l.key} className="grid grid-cols-[96px_1fr] gap-5 py-6 md:grid-cols-[1fr_120px_120px] md:items-center md:gap-0">
                <div className="contents md:flex md:gap-5">
                  <Link href={`/product/${l.slug}`} className="relative h-[120px] w-24 shrink-0 overflow-hidden bg-surface">
                    <Image src={l.image} alt={l.name} fill sizes="96px" className="object-cover" />
                  </Link>
                  <div className="flex flex-col">
                    <Link href={`/product/${l.slug}`} className="font-display text-xl leading-tight hover:text-gold">{l.name}</Link>
                    <p className="mt-1 text-sm text-secondary">{formatINR(l.price)}{l.size && ` · Size ${l.size}`}</p>
                    <div className="mt-4 flex items-center gap-4 md:hidden">
                      <QtyStepper small value={l.qty} max={l.maxQty} onChange={(n) => setQty(l.key, n)} />
                      <span className="ml-auto tabular-nums">{formatINR(l.price * l.qty)}</span>
                    </div>
                    <button onClick={() => remove(l.key)} className="mt-3 self-start text-[12px] text-secondary underline underline-offset-4 hover:text-ivory">Remove</button>
                  </div>
                </div>
                <div className="hidden justify-center md:flex"><QtyStepper small value={l.qty} max={l.maxQty} onChange={(n) => setQty(l.key, n)} /></div>
                <p className="hidden text-right tabular-nums md:block">{formatINR(l.price * l.qty)}</p>
              </li>
            ))}
          </ul>
          <Link href="/shop" className="mt-6 inline-block text-[12px] uppercase tracking-[0.14em] link">← Continue shopping</Link>
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            {error && <p role="alert" className="mb-4 border-l-2 border-error bg-error/5 px-4 py-3 text-sm text-error">{error}</p>}
            <OrderSummary quote={quote} loading={loading}>
              <Link href="/checkout" aria-disabled={!quote} className={`btn-primary w-full ${!quote ? "pointer-events-none opacity-50" : ""}`}>Proceed to checkout</Link>
            </OrderSummary>
          </div>
        </div>
      </div>
    </div>
  );
}
