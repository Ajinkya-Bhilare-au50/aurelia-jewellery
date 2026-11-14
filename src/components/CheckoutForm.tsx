"use client";

import Image from "@/components/Img";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { formatINR } from "@/lib/format";
import type { PaymentMode } from "@/lib/razorpay";
import type { Address, SavedAddress } from "@/lib/types";
import { AddressFields, addressLines } from "./AddressFields";
import { toCartPayload, useCart } from "./CartProvider";
import { InfoIcon, PlusIcon, ShieldIcon, TrashIcon } from "./Icons";
import { OrderSummary } from "./OrderSummary";
import { QtyStepper } from "./QtyStepper";
import { useQuote } from "./useQuote";

type CheckoutRes =
  | { mode: "demo"; orderId: string; number: string; amount: number }
  | { mode: "razorpay"; orderId: string; number: string; amount: number; keyId: string; razorpayOrderId: string; prefill: Record<string, string> };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const ADDRESS_KEYS = ["name", "phone", "line1", "line2", "city", "state", "pincode"] as const;

export function CheckoutForm({ email, defaultAddress, savedAddresses = [], mode }: { email: string; defaultAddress: Partial<Address>; savedAddresses?: SavedAddress[]; mode: PaymentMode }) {
  // Which address to ship to: a saved one (its id) or "new" (the form below).
  const [shipTo, setShipTo] = useState<string>(savedAddresses[0]?.id ?? "new");
  const router = useRouter();
  const { lines, coupon, ready, clear, setQty, remove } = useCart();
  const { quote, error: quoteError, loading } = useQuote();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<Extract<CheckoutRes, { mode: "demo" }> | null>(null);

  const finish = async (orderId: string, body: Record<string, unknown>) => {
    await api("/api/checkout/verify", { orderId, ...body });
    clear();
    router.push(`/account/orders/${orderId}?placed=1`);
    router.refresh();
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const chosen = savedAddresses.find((a) => a.id === shipTo);
    const address = (chosen ? Object.fromEntries(ADDRESS_KEYS.map((k) => [k, chosen[k] ?? ""])) : Object.fromEntries(ADDRESS_KEYS.map((k) => [k, String(fd.get(k) ?? "")]))) as unknown as Address;
    const saveAddress = !chosen && fd.get("saveAddress") === "on";
    try {
      const res = await api<CheckoutRes>("/api/checkout", { lines: toCartPayload(lines), couponCode: coupon || undefined, address, saveAddress });
      if (res.mode === "demo") {
        setDemo(res);
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load Razorpay. Check your connection and try again.");
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.razorpayOrderId,
        amount: res.amount * 100,
        currency: "INR",
        name: "Aurelia Fine Jewellery",
        description: `Order ${res.number}`,
        prefill: res.prefill,
        theme: { color: "#1C1917" },
        handler: (r: Record<string, string>) => finish(res.orderId, r).catch((err: Error) => { setError(err.message); setBusy(false); }),
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => { setError("Payment failed. You have not been charged; please try again."); setBusy(false); });
      rzp.open();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (ready && !lines.length && !demo)
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="h-display text-[40px]">Your bag is empty</h1>
        <Link href="/shop" className="btn-primary mt-8">Shop the collection</Link>
      </div>
    );


  return (
    <div className="container-page py-12 lg:py-16">
      <nav aria-label="Checkout steps" className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-secondary">
        <Link href="/cart" className="hover:text-ivory">Bag</Link><span>—</span><span className="text-ivory">Details</span><span>—</span><span>Payment</span>
      </nav>
      <h1 className="h-display mt-4 h-page">Checkout</h1>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <form id="checkout" onSubmit={onSubmit} className="lg:col-span-7">
          <section>
            <h2 className="font-display text-2xl">Contact</h2>
            <p className="mt-2 text-sm text-secondary">Order updates will be sent to <span className="text-ivory">{email}</span></p>
          </section>
          <section className="mt-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl">Shipping address</h2>
              {savedAddresses.length > 0 && <Link href="/account#addresses" className="text-[12px] uppercase tracking-[0.12em] link">Manage</Link>}
            </div>
            {savedAddresses.length > 0 && (
              <div role="radiogroup" aria-label="Saved addresses" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {savedAddresses.map((a) => {
                  const [name, ...rest] = addressLines(a);
                  const on = shipTo === a.id;
                  return (
                    <label key={a.id} className={`relative flex cursor-pointer gap-3 border p-4 text-sm transition-colors ${on ? "border-gold bg-gold/5" : "border-border hover:border-muted"}`}>
                      <input type="radio" name="shipTo" value={a.id} checked={on} onChange={() => setShipTo(a.id)} className="mt-1 h-4 w-4 shrink-0 accent-gold" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-medium text-ivory">{name}{a.isDefault && <span className="badge bg-gold/10 text-gold">Default</span>}</span>
                        {rest.map((l) => <span key={l} className="mt-0.5 block break-words text-secondary">{l}</span>)}
                      </span>
                    </label>
                  );
                })}
                <label className={`flex cursor-pointer items-center gap-3 border border-dashed p-4 text-sm transition-colors ${shipTo === "new" ? "border-gold bg-gold/5" : "border-border hover:border-muted"}`}>
                  <input type="radio" name="shipTo" value="new" checked={shipTo === "new"} onChange={() => setShipTo("new")} className="h-4 w-4 shrink-0 accent-gold" />
                  <span className="inline-flex items-center gap-2 text-ivory"><PlusIcon size={16} /> Deliver to a new address</span>
                </label>
              </div>
            )}
            {shipTo === "new" && (
              <div className="mt-6">
                <AddressFields defaults={savedAddresses.length ? {} : defaultAddress} />
                <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" name="saveAddress" defaultChecked className="h-4 w-4 accent-gold" />
                  Save this address for next time
                </label>
              </div>
            )}
          </section>
          {mode === "demo" ? (
            <section className="mt-10 flex items-start gap-4 border border-gold/50 bg-gold/5 p-5">
              <InfoIcon className="mt-0.5 shrink-0 text-gold" />
              <div className="text-sm">
                <p className="font-medium">Demo store: no real payment</p>
                <p className="mt-1 text-secondary">This is a portfolio project. At the payment step you can simulate a successful payment; no money is charged and nothing is shipped.</p>
              </div>
            </section>
          ) : (
            <section className="mt-10 flex items-start gap-4 border border-border bg-surface p-5">
              <ShieldIcon className="mt-0.5 shrink-0 text-gold" />
              <div className="text-sm">
                <p className="font-medium">Secure payment via Razorpay</p>
                <p className="mt-1 text-secondary">UPI, cards, netbanking and wallets. Your order is fully insured until it reaches you.</p>
              </div>
            </section>
          )}
        </form>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <ul className="mb-6 divide-y divide-border border-y border-border">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-4 py-4">
                  <Link href={`/product/${l.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden bg-surface">
                    <Image src={l.image} alt={l.name} fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/product/${l.slug}`} className="font-display text-lg leading-tight transition-colors hover:text-gold">{l.name}</Link>
                        <p className="mt-0.5 text-[12px] text-secondary">
                          {l.size && <>Size {l.size} · </>}
                          {formatINR(l.price)}{l.qty > 1 && " each"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums">{formatINR(l.price * l.qty)}</p>
                    </div>
                    <div className={`mt-auto flex items-center justify-between gap-3 pt-3 ${busy ? "pointer-events-none opacity-50" : ""}`} aria-disabled={busy}>
                      <QtyStepper small value={l.qty} max={l.maxQty} onChange={(n) => setQty(l.key, n)} />
                      <button
                        type="button"
                        onClick={() => remove(l.key)}
                        aria-label={`Remove ${l.name} from your bag`}
                        className="flex items-center gap-1.5 text-[12px] text-secondary transition-colors hover:text-error"
                      >
                        <TrashIcon size={14} /> Remove
                      </button>
                    </div>
                    {l.qty >= Math.min(l.maxQty, 10) && <p className="mt-2 text-[11px] text-warning">{l.maxQty <= 10 ? `Only ${l.maxQty} in stock` : "Maximum 10 per order"}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {(quoteError || error) && <p role="alert" className="mb-4 border-l-2 border-error bg-error/5 px-4 py-3 text-sm text-error">{error || quoteError}</p>}
            <OrderSummary quote={quote} loading={loading}>
              <button form="checkout" className="btn-primary w-full" disabled={!quote || busy}>
                {busy ? "Processing…" : quote ? `Pay ${formatINR(quote.total)}` : "Pay"}
              </button>
            </OrderSummary>
          </div>
        </aside>
      </div>

      {demo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" role="dialog" aria-modal="true" aria-label="Demo payment">
          <div className="w-full max-w-md bg-background p-8 animate-fade">
            <p className="label !text-gold">Demo payment mode</p>
            <h2 className="h-display mt-3 text-3xl">Order {demo.number}</h2>
            <p className="mt-3 text-sm text-secondary">This is a demo store, so no real payment is taken. Simulate a successful payment to see the full order journey: confirmation, tracking and cancellation.</p>
            <p className="mt-6 font-display text-4xl tabular-nums">{formatINR(demo.amount)}</p>
            <div className="mt-8 grid gap-3">
              <button className="btn-primary" onClick={() => finish(demo.orderId, { demo: true }).catch((e: Error) => { setError(e.message); setDemo(null); setBusy(false); })}>Simulate successful payment</button>
              <button className="btn-secondary" onClick={() => { setDemo(null); setBusy(false); setError("Payment cancelled. Your order is saved as awaiting payment."); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
