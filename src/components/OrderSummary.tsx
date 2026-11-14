"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";
import type { Quote } from "@/lib/pricing";
import { useCart } from "./CartProvider";

function Row({ label, value, muted, accent }: { label: React.ReactNode; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${muted ? "text-secondary" : ""} ${accent ? "text-success" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function CouponField() {
  const { coupon, setCoupon } = useCart();
  const [value, setValue] = useState(coupon);
  if (coupon)
    return (
      <div className="flex items-center justify-between border border-dashed border-gold bg-gold/5 px-4 py-3 text-sm">
        <span>Code <strong className="font-semibold tracking-wider">{coupon}</strong></span>
        <button type="button" onClick={() => { setCoupon(""); setValue(""); }} className="text-[12px] text-secondary underline underline-offset-4 hover:text-ivory">Remove</button>
      </div>
    );
  return (
    <form
      className="flex"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) setCoupon(value.trim().toUpperCase());
      }}
    >
      <label htmlFor="coupon" className="sr-only">Coupon code</label>
      <input id="coupon" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Coupon code" className="input h-11 flex-1 uppercase placeholder:normal-case" />
      <button className="btn-secondary btn-sm h-11 border-l-0 px-5">Apply</button>
    </form>
  );
}

export function OrderSummary({ quote, loading, children }: { quote: Quote | null; loading: boolean; children?: React.ReactNode }) {
  return (
    <div className={`bg-surface p-6 transition-opacity lg:p-8 ${loading ? "opacity-60" : ""}`}>
      <h2 className="font-display text-2xl">Order summary</h2>
      <div className="mt-6"><CouponField /></div>
      {quote?.couponError && <p role="alert" className="mt-2 text-[13px] text-error">{quote.couponError}</p>}
      {quote && (
        <dl className="mt-6 space-y-3 border-t border-border pt-6">
          <Row label="Subtotal" value={formatINR(quote.subtotal)} />
          {quote.discount > 0 && <Row accent label={quote.discountLabel ?? "Discount"} value={`− ${formatINR(quote.discount)}`} />}
          <Row muted label="Insured shipping" value={quote.shipping ? formatINR(quote.shipping) : "Free"} />
          <div className="flex items-baseline justify-between border-t border-border pt-4">
            <dt className="label !text-ivory">Total</dt>
            <dd className="font-display text-[28px] tabular-nums">{formatINR(quote.total)}</dd>
          </div>
          <p className="text-[12px] text-secondary">Inclusive of GST</p>
        </dl>
      )}
      {children && <div className="mt-6">{children}</div>}
      <p className="mt-6 text-center text-[12px] text-secondary">Try codes <span className="font-medium text-secondary">WELCOME10</span> or <span className="font-medium text-secondary">SPARKLE2000</span></p>
    </div>
  );
}
