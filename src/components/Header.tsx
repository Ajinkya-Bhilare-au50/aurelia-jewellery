"use client";

import Image from "@/components/Img";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { img } from "@/lib/format";
import type { PublicUser } from "@/lib/types";
import { useCart } from "./CartProvider";
import { Avatar } from "./Avatar";
import { SearchPanel } from "./SearchPanel";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "@/lib/theme";
import { BagIcon, ChevronDown, CloseIcon, HeartIcon, MenuIcon, SaleIcon, SearchIcon, TruckIcon, UserIcon } from "./Icons";
import { useWishlist } from "./WishlistProvider";

const CATEGORIES = [
  { href: "/shop?category=rings", label: "Rings" },
  { href: "/shop?category=necklaces", label: "Necklaces" },
  { href: "/shop?category=earrings", label: "Earrings" },
  { href: "/shop?category=bracelets", label: "Bracelets" },
];

const MEGA = [
  { title: "Category", links: [...CATEGORIES, { href: "/shop", label: "All jewellery" }] },
  { title: "Metal", links: ["Gold", "Rose Gold", "Silver", "Platinum"].map((m) => ({ href: `/shop?metal=${encodeURIComponent(m)}`, label: m })) },
  { title: "Edit", links: [{ href: "/shop?sort=newest", label: "New arrivals" }, { href: "/shop?sale=1", label: "Special prices" }, { href: "/shop?price=0-25000", label: "Gifts under ₹25,000" }, { href: "/product/rani-temple-necklace-set", label: "Bridal atelier" }] },
];

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="absolute right-1 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold text-background">{n}</span>;
}

export function Header({ user, sale, theme }: { user: PublicUser | null; sale?: { text: string; ends: string } | null; theme: Theme }) {
  const { count, setDrawerOpen, ready } = useCart();
  const wish = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen && !megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, megaOpen]);

  const openMega = () => { clearTimeout(closeTimer.current); setMegaOpen(true); };
  const closeMega = () => { closeTimer.current = setTimeout(() => setMegaOpen(false), 120); };

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const accountHref = user ? (user.role === "admin" ? "/admin" : "/account") : "/login";
  const navLink = "relative py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-secondary transition-colors hover:text-ivory";
  const t = menuOpen ? 0 : -1;

  return (
    <>
      {sale ? (
        <Link href="/shop?sale=1" className="group block border-b border-gold/40 bg-gold/10 transition-colors hover:bg-gold/15">
          <p className="container-page flex min-h-9 items-center justify-center gap-2 py-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
            <SaleIcon size={14} className="shrink-0" />
            <span>{sale.text}</span>
            <span className="hidden text-gold/70 sm:inline">· Ends {sale.ends}</span>
            <span className="hidden underline-offset-4 group-hover:underline md:inline">Shop the sale →</span>
          </p>
        </Link>
      ) : (
        <div className="border-b border-border bg-surface-muted">
          <p className="container-page flex h-9 items-center justify-center text-center text-[11px] uppercase tracking-[0.16em] text-secondary">
            Complimentary insured shipping above ₹2,999
            <span className="mx-3 hidden text-gold sm:inline">◆</span>
            <span className="hidden sm:inline">BIS hallmarked &amp; certified</span>
          </p>
        </div>
      )}

      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled || megaOpen ? "border-border bg-background/95 backdrop-blur-md" : "border-transparent bg-background"}`} onMouseLeave={closeMega}>
        <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[76px]">
          <div className="flex items-center">
            <button aria-label="Open menu" aria-expanded={menuOpen} className="icon-btn -ml-3 lg:hidden" onClick={() => setMenuOpen(true)}><MenuIcon /></button>
            <button aria-label="Search" className="icon-btn lg:hidden" onClick={() => setSearchOpen((v) => !v)}><SearchIcon /></button>
            <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
              <button className={`${navLink} flex items-center gap-1 ${megaOpen ? "!text-ivory" : ""}`} aria-expanded={megaOpen} aria-controls="mega" onMouseEnter={openMega} onClick={() => setMegaOpen((v) => !v)}>
                Shop <ChevronDown width={14} height={14} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
              </button>
              {CATEGORIES.slice(0, 3).map((n) => <Link key={n.href} href={n.href} className={`${navLink} hidden xl:block`} onMouseEnter={closeMega}>{n.label}</Link>)}
              <Link href="/track" className={navLink} onMouseEnter={closeMega}>Track order</Link>
            </nav>
          </div>

          <Link href="/" className="flex flex-col items-center leading-none" aria-label="Aurelia home">
            <span className="font-display text-[24px] tracking-[0.34em] text-ivory sm:text-[30px]">AURELIA</span>
            <span className="mt-1 text-[8px] uppercase tracking-[0.46em] text-gold sm:text-[9px]">Fine Jewellery</span>
          </Link>

          <div className="flex items-center justify-end">
            <button aria-label="Search" aria-expanded={searchOpen} className="icon-btn hidden lg:grid" onClick={() => setSearchOpen((v) => !v)}><SearchIcon /></button>
            <ThemeToggle initial={theme} className="icon-btn hidden sm:grid" />
            <Link href={accountHref} aria-label={user ? `My account (${user.name})` : "Sign in"} className="icon-btn hidden sm:grid">
              {user ? <Avatar id={user.id} name={user.name} src={user.avatarUrl} size="xs" className="ring-1 ring-border transition-shadow hover:ring-gold" /> : <UserIcon />}
            </Link>
            <Link href="/wishlist" aria-label={`Wishlist, ${wish.items.length} items`} className="icon-btn relative hidden sm:grid"><HeartIcon /><Count n={wish.ready ? wish.items.length : 0} /></Link>
            <button aria-label={`Open bag, ${count} items`} className="icon-btn relative -mr-3" onClick={() => setDrawerOpen(true)}>
              <BagIcon /><Count n={ready ? count : 0} />
            </button>
          </div>
        </div>

        {/* Mega menu (desktop) */}
        <div id="mega" onMouseEnter={openMega} className={`absolute inset-x-0 top-full hidden border-b border-border bg-surface-elevated transition-[opacity,transform,visibility] duration-200 lg:block ${megaOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}>
          <div className="container-page grid grid-cols-12 gap-8 py-10">
            {MEGA.map((col) => (
              <div key={col.title} className="col-span-2">
                <p className="label !text-gold">{col.title}</p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => <li key={l.href}><Link href={l.href} className="text-[14px] text-secondary transition-colors hover:text-ivory">{l.label}</Link></li>)}
                </ul>
              </div>
            ))}
            <Link href="/product/rani-temple-necklace-set" data-theme="dark" className="group relative col-span-4 col-start-7 aspect-[16/10] overflow-hidden bg-surface">
              <Image src={img("1601121141461-9d6647bca1ed")} alt="Temple gold necklace with ruby stones" fill sizes="30vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute bottom-5 left-5"><span className="label !text-gold">The Bridal Atelier</span><span className="mt-1 block font-display text-[26px] text-ivory">Temple gold</span></span>
            </Link>
            <Link href="/shop?category=rings" data-theme="dark" className="group relative col-span-2 overflow-hidden bg-surface">
              <Image src={img("1605100804763-247f67b3557e")} alt="Diamond halo engagement ring" fill sizes="16vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute bottom-5 left-5"><span className="label !text-gold">Engagement</span><span className="mt-1 block font-display text-[26px] text-ivory">Solitaires</span></span>
            </Link>
          </div>
        </div>

        {searchOpen && <SearchPanel onClose={closeSearch} />}
      </header>

      {/* Mobile slide-in navigation */}
      <div className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <div className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setMenuOpen(false)} />
        <nav className={`absolute left-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col bg-surface-elevated transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Mobile">
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <span className="font-display text-xl tracking-[0.3em]">AURELIA</span>
            <button aria-label="Close menu" className="icon-btn -mr-3" onClick={() => setMenuOpen(false)} tabIndex={t}><CloseIcon /></button>
          </div>
          <ul className="flex-1 overflow-y-auto px-5 py-2">
            {[{ href: "/shop", label: "Shop all" }, ...CATEGORIES, { href: "/shop?sort=newest", label: "New arrivals" }].map((n) => (
              <li key={n.href} className="border-b border-border">
                <Link href={n.href} tabIndex={t} className="flex min-h-[56px] items-center font-display text-[26px] text-ivory">{n.label}</Link>
              </li>
            ))}
          </ul>
          <div className="grid gap-1 border-t border-border p-5 text-[14px] text-secondary">
            <Link href={accountHref} tabIndex={t} className="flex min-h-[44px] items-center gap-3 hover:text-ivory">{user ? <Avatar id={user.id} name={user.name} src={user.avatarUrl} size="xs" /> : <UserIcon />} {user ? `Hi, ${user.name.split(" ")[0]}` : "Sign in / Register"}</Link>
            <Link href="/wishlist" tabIndex={t} className="flex min-h-[44px] items-center gap-3 hover:text-ivory"><HeartIcon /> Wishlist</Link>
            <Link href="/track" tabIndex={t} className="flex min-h-[44px] items-center gap-3 hover:text-ivory"><TruckIcon /> Track your order</Link>
            <ThemeToggle initial={theme} withLabel tabIndex={t} className="flex min-h-[44px] items-center gap-3 text-left hover:text-ivory" />
          </div>
        </nav>
      </div>
    </>
  );
}
