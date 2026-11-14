import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilters, SortSelect } from "@/components/ShopFilters";
import { ShopSearch } from "@/components/ShopSearch";
import { filterProducts, type ShopParams } from "@/lib/catalog";
import { POPULAR_SEARCHES } from "@/lib/search";
import { listShopProducts } from "@/lib/db";
import { CATEGORY_LABEL } from "@/lib/format";

export const metadata = { title: "Shop fine jewellery" };

export default async function ShopPage(props: { searchParams: Promise<ShopParams> }) {
  const searchParams = await props.searchParams;
  const { category, list, corrected } = filterProducts(await listShopProducts(), searchParams);

  const title = searchParams.q ? `Results for “${searchParams.q}”` : category ? CATEGORY_LABEL[category] : searchParams.sale ? "Special prices" : "All jewellery";
  const tabs: [string, string][] = [["", "All"], ...(Object.entries(CATEGORY_LABEL) as [string, string][])];
  const tabHref = (key: string) => {
    const p = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => k !== "category" && v) as [string, string][]);
    if (key) p.set("category", key);
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="container-page pb-8 pt-10 lg:pt-14">
      <nav aria-label="Breadcrumb" className="text-[12px] text-muted">
        <Link href="/" className="hover:text-ivory">Home</Link><span className="mx-2">/</span><span className="text-secondary">Shop</span>
      </nav>
      <h1 className="h-page mt-4">{title}</h1>
      {corrected && list.length > 0 && (
        <p className="mt-2 text-sm text-secondary">Showing results for <span className="text-ivory">“{corrected}”</span></p>
      )}

      <div className="sticky top-16 z-30 mt-8 border-y border-border bg-background/95 py-3 backdrop-blur-md lg:top-[76px]">
        <div className="scroll-x -mx-1 flex gap-1 pr-8" role="tablist" aria-label="Category">
          {tabs.map(([key, label]) => {
            const activeTab = (category ?? "") === key;
            return <Link key={label} href={tabHref(key)} scroll={false} role="tab" aria-selected={activeTab} className={activeTab ? "tab-active" : "tab"}>{label}</Link>;
          })}
        </div>
        {/* Phones: search gets its own full-width row (desktop has it inside the filter bar) */}
        <Suspense><ShopSearch className="mt-3 lg:hidden" /></Suspense>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Suspense><ShopFilters resultCount={list.length} /></Suspense>
          <div className="flex items-center gap-3">
            <p className="hidden text-[13px] text-muted sm:block" aria-live="polite">{list.length} {list.length === 1 ? "piece" : "pieces"}</p>
            <Suspense><SortSelect /></Suspense>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="h-section">{searchParams.q ? `No pieces match “${searchParams.q}”` : "Nothing matches just yet"}</p>
          <p className="mt-3 text-secondary">{searchParams.q ? "Check the spelling or try one of these:" : "Try widening the price range or another material."}</p>
          {searchParams.q && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.map((t) => <Link key={t} href={`/shop?q=${encodeURIComponent(t)}`} className="border border-border px-4 py-2 text-[12px] uppercase tracking-[0.12em] text-secondary transition-colors hover:border-gold hover:text-ivory">{t}</Link>)}
            </div>
          )}
          <Link href="/shop" className="btn-secondary mt-8">{searchParams.q ? "Browse all jewellery" : "Clear all filters"}</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}
