"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "../Avatar";
import { CouponIcon, DashboardIcon, DiamondIcon, PackageIcon, SaleIcon, StoreIcon } from "../Icons";
import { LogoutButton } from "../LogoutButton";

const LINKS = [
  ["/admin", "Overview", DashboardIcon],
  ["/admin/orders", "Orders", PackageIcon],
  ["/admin/products", "Products", DiamondIcon],
  ["/admin/sales", "Sales", SaleIcon],
  ["/admin/coupons", "Coupons", CouponIcon],
] as const;

export function AdminNav({ id, name, avatarUrl }: { id: string; name: string; avatarUrl?: string }) {
  const path = usePathname();
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="flex items-center gap-4">
        <Avatar id={id} name={name} src={avatarUrl} size="md" />
        <div>
          <p className="label !text-gold">Admin</p>
          <p className="mt-1 font-display text-2xl">{name}</p>
        </div>
      </div>
      {/* Phones/tablets: all five sections as an even row of icon-over-label tabs (nothing hidden off-screen). Desktop: vertical list. */}
      <nav className="mt-6 grid grid-cols-5 border-b border-border lg:flex lg:flex-col lg:gap-1 lg:border-b-0 lg:border-l" aria-label="Admin">
        {LINKS.map(([href, label, Icon]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`-mb-px flex min-w-0 flex-col items-center gap-1.5 border-b-2 px-1 py-2.5 text-[11px] transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:text-[12px] sm:uppercase sm:tracking-[0.12em] lg:-ml-px lg:mb-0 lg:justify-start lg:gap-3 lg:whitespace-nowrap lg:border-b-0 lg:border-l-2 lg:px-4 lg:py-3 lg:tracking-[0.14em] ${active ? "border-gold text-ivory" : "border-transparent text-secondary hover:text-ivory"}`}>
              <Icon size={18} className={`shrink-0 ${active ? "text-gold" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 hidden flex-col items-start gap-4 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-secondary transition-colors hover:text-ivory"><StoreIcon size={16} /> View store</Link>
        <LogoutButton withIcon />
      </div>
    </aside>
  );
}
