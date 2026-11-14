import Link from "next/link";
import { SITE } from "@/lib/site";
import { paymentMode } from "@/lib/razorpay";
import { CardIcon, ClockIcon, InfoIcon, LockIcon, MailIcon, PinIcon } from "./Icons";

const COLS = [
  { title: "Shop", links: [["Rings", "/shop?category=rings"], ["Necklaces", "/shop?category=necklaces"], ["Earrings", "/shop?category=earrings"], ["Bracelets", "/shop?category=bracelets"], ["New arrivals", "/shop?sort=newest"]] },
  { title: "Client care", links: [["Track your order", "/track"], ["Contact us", "/contact"], ["Shipping", "/shipping-policy"], ["Returns & refunds", "/refund-policy"], ["My account", "/account"]] },
  { title: "The house", links: [["Our craft", "/#craft"], ["Bridal atelier", "/product/rani-temple-necklace-set"], ["Refer a friend", "/account"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <p className="font-display text-[30px] tracking-[0.3em] text-ivory">AURELIA</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-secondary">Heirloom-quality fine jewellery, hand-finished in Jaipur and Coimbatore. BIS hallmarked, ethically sourced, made to be passed on.</p>
          <address className="mt-6 space-y-2 text-sm not-italic leading-relaxed text-muted">
            <p className="flex gap-3"><PinIcon size={16} className="mt-0.5 shrink-0 text-gold" />{SITE.address.join(", ")}</p>
            <p className="flex gap-3"><ClockIcon size={16} className="mt-0.5 shrink-0 text-gold" />{SITE.hours}</p>
            <p className="flex gap-3"><MailIcon size={16} className="mt-0.5 shrink-0 text-gold" /><a href={`mailto:${SITE.email}`} className="transition-colors hover:text-ivory">{SITE.email}</a></p>
          </address>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="lg:col-span-2">
            <p className="label !text-gold">{c.title}</p>
            <ul className="mt-5 space-y-3 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="text-secondary transition-colors hover:text-ivory">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div className="lg:col-span-2">
          <p className="label !text-gold">We accept</p>
          <p className="mt-5 flex gap-3 text-sm leading-relaxed text-secondary"><CardIcon size={16} className="mt-0.5 shrink-0 text-gold" />UPI · Cards · Netbanking · Wallets</p>
          {paymentMode() === "demo" ? (
            <p className="mt-3 flex items-center gap-3 text-[12px] text-muted"><InfoIcon size={14} className="shrink-0" />Demo store · payments are simulated</p>
          ) : (
            <p className="mt-3 flex items-center gap-3 text-[12px] text-muted"><LockIcon size={14} className="shrink-0" />Secure payments by Razorpay</p>
          )}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/terms" className="transition-colors hover:text-ivory">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-ivory">Privacy</Link>
          </p>
          <p>Developed by <span className="text-secondary">Ajinkya Bhilare</span></p>
          <p>Prices inclusive of GST</p>
        </div>
      </div>
    </footer>
  );
}
