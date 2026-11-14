import type { Category, Product } from "./types";
import { CATEGORY_LABEL } from "./format";
import { searchProducts } from "./search";

export const PRICE_RANGES = [
  { value: "0-25000", label: "Under ₹25,000", min: 0, max: 25000 },
  { value: "25000-75000", label: "₹25,000 – ₹75,000", min: 25000, max: 75000 },
  { value: "75000-150000", label: "₹75,000 – ₹1,50,000", min: 75000, max: 150000 },
  { value: "150000-", label: "Above ₹1,50,000", min: 150000, max: Infinity },
] as const;

export const METALS = ["Gold", "Rose Gold", "Silver", "Platinum"] as const;
export const PURITIES = ["14K", "18K", "22K", "925", "PT950"] as const;

export const SORTS = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
] as const;

export type ShopParams = { category?: string; metal?: string; purity?: string; price?: string; stock?: string; sale?: string; sort?: string; q?: string };

/** Pure filter + sort used by the shop page (server). */
export function filterProducts(all: Product[], sp: ShopParams) {
  const category = sp.category && sp.category in CATEGORY_LABEL ? (sp.category as Category) : undefined;
  const range = PRICE_RANGES.find((r) => r.value === sp.price);
  const q = sp.q?.trim();

  // Text search first (relevance-ranked, typo-tolerant), then the facet filters.
  const search = q ? searchProducts(all, q) : null;
  const list = (search ? search.results : all).filter(
    (p) =>
      (!category || p.category === category) &&
      (!sp.metal || p.metal === sp.metal) &&
      (!sp.purity || p.purity === sp.purity) &&
      (!range || (p.price >= range.min && p.price < range.max)) &&
      (sp.stock !== "1" || p.stock > 0) &&
      (sp.sale !== "1" || Boolean(p.compareAtPrice)),
  );

  const sorters: Record<string, (a: Product, b: Product) => number> = {
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  const byDefault = (a: Product, b: Product) => Number(b.stock > 0) - Number(a.stock > 0) || Number(b.featured) - Number(a.featured);
  const sorter = sorters[sp.sort ?? ""];
  // With a search query and no explicit sort, keep relevance order.
  const sorted = sorter ? [...list].sort(sorter) : search ? list : [...list].sort(byDefault);
  return { category, list: sorted, corrected: search?.corrected };
}
