import Link from "next/link";
import { SITE } from "@/lib/site";
import { ChatIcon, DocumentIcon, LockIcon, MailIcon, PhoneIcon, PinIcon, ReturnIcon, TruckIcon } from "./Icons";

const LINKS = [
  ["Terms & conditions", "/terms", DocumentIcon],
  ["Privacy policy", "/privacy", LockIcon],
  ["Returns & refunds", "/refund-policy", ReturnIcon],
  ["Shipping policy", "/shipping-policy", TruckIcon],
  ["Contact us", "/contact", ChatIcon],
] as const;

/** Shared shell for policy pages: title, last-updated line, prose, and cross-links. */
export function LegalPage({ title, path, children }: { title: string; path: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-12 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-12">
        <nav aria-label="Policies" className="lg:col-span-3">
          <p className="label !text-gold">Policies</p>
          <ul className="mt-5 space-y-3 text-sm">
            {LINKS.map(([label, href, Icon]) => (
              <li key={href}>
                <Link href={href} aria-current={href === path ? "page" : undefined} className={`flex items-center gap-3 ${href === path ? "text-ivory" : "text-secondary transition-colors hover:text-ivory"}`}>
                  <Icon size={16} className={href === path ? "text-gold" : ""} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="lg:col-span-8 lg:col-start-5">
          <h1 className="h-display h-page">{title}</h1>
          <p className="mt-3 text-[13px] text-muted">Last updated {SITE.updated}</p>
          <div className="legal mt-10 space-y-8 text-[15px] leading-relaxed text-secondary">{children}</div>
        </article>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ivory">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function BusinessDetails() {
  return (
    <address className="space-y-2 not-italic">
      <p className="text-ivory">{SITE.legalName}</p>
      <p className="flex gap-3"><PinIcon size={16} className="mt-1 shrink-0 text-gold" /><span>{SITE.address.join(", ")}</span></p>
      <p className="flex items-center gap-3"><MailIcon size={16} className="shrink-0 text-gold" /><a className="link text-ivory" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      <p className="flex items-center gap-3"><PhoneIcon size={16} className="shrink-0 text-gold" /><a className="link text-ivory" href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a></p>
      {SITE.gstin && <p className="flex items-center gap-3"><DocumentIcon size={16} className="shrink-0 text-gold" />GSTIN: {SITE.gstin}</p>}
    </address>
  );
}
