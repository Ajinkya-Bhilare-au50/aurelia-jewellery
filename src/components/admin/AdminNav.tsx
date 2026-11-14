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
      <nav className="scroll-x mt-6 flex gap-1 border-b border-border lg:flex-col lg:border-b-0 lg:border-l" aria-label="Admin">
        {LINKS.map(([href, label, Icon]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`-mb-px flex items-center gap-3 whitespace-nowrap border-b-2 px-4 py-3 text-[12px] uppercase tracking-[0.14em] transition-colors lg:-ml-px lg:mb-0 lg:border-b-0 lg:border-l-2 ${active ? "border-gold text-ivory" : "border-transparent text-secondary hover:text-ivory"}`}>
              <Icon size={16} className={active ? "text-gold" : ""} />
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
