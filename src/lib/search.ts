// Product search: tokenised, typo-tolerant, relevance-ranked. Pure (no DB access).
// Designed for a boutique catalogue (hundreds to a few thousand products) searched in memory.
import { CATEGORY_LABEL } from "./format";
import type { Category, Product } from "./types";

const STOPWORDS = new Set(["a", "an", "the", "and", "or", "for", "with", "in", "of", "to", "my", "me", "jewellery", "jewelry", "piece", "pieces"]);

/** Everyday words → canonical terms that appear in the catalogue. */
const SYNONYMS: Record<string, string[]> = {
  ring: ["ring"], band: ["ring"], solitaire: ["solitaire", "ring"], engagement: ["solitaire", "ring"],
  earring: ["earring"], stud: ["earring"], jhumka: ["earring"], jhumki: ["earring"], hoop: ["hoop", "earring"], drop: ["drop"],
  necklace: ["necklace"], pendant: ["pendant", "necklace"], chain: ["chain"], mangalsutra: ["necklace"], choker: ["necklace"], haar: ["necklace"],
  bracelet: ["bracelet"], bangle: ["bangle", "bracelet"], kada: ["bangle", "bracelet"], cuff: ["bracelet"],
  diamond: ["diamond"], diamonds: ["diamond"], pearl: ["pearl"], pearls: ["pearl"], sapphire: ["sapphire"], ruby: ["ruby"], emerald: ["emerald"], topaz: ["topaz"],
  bridal: ["bridal", "temple"], wedding: ["bridal", "temple"], temple: ["temple"],
  gold: ["gold"], silver: ["silver"], platinum: ["platinum"], rose: ["rose"],
};

/** Frequent misspellings too far from the right word for safe fuzzy matching. */
const MISSPELLINGS: Record<string, string> = {
  neckless: "necklace", nekless: "necklace", necklas: "necklace", neclace: "necklace",
  braslet: "bracelet", bracelate: "bracelet", brasslet: "bracelet",
  earing: "earring", earingz: "earring", jumka: "jhumka", jhumkas: "jhumka",
  daimond: "diamond", dimond: "diamond", diamend: "diamond", perl: "pearl", saphire: "sapphire", platinam: "platinum",
};

const CATEGORY_OF: Record<string, Category> = { ring: "rings", earring: "earrings", necklace: "necklaces", bracelet: "bracelets" };

/** "Rings" → "ring", "earrings" → "earring", "bracelets" → "bracelet", "18K" stays. */
function stem(w: string) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("es") && /(ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export const tokenize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);

/** Levenshtein distance with early exit (only small distances matter). */
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

type Doc = { p: Product; name: string[]; tags: string[]; desc: string[]; nameText: string };

function index(products: Product[]): Doc[] {
  return products.map((p) => {
    const name = tokenize(p.name);
    const tags = [...tokenize(p.category), ...tokenize(CATEGORY_LABEL[p.category]), ...tokenize(p.metal), ...tokenize(p.purity)];
    return { p, name, tags, desc: tokenize(p.description), nameText: p.name.toLowerCase() };
  });
}

/** Best match strength of one query term against a document (0 = no match). */
function termScore(term: string, d: Doc) {
  const forms = SYNONYMS[term] ?? [term];
  let s = 0;
  for (const f of forms) {
    if (d.name.includes(f)) s = Math.max(s, 10);
    else if (d.name.some((w) => w.startsWith(f) && f.length >= 2)) s = Math.max(s, 7);
    if (d.tags.includes(f) || (CATEGORY_OF[f] && d.p.category === CATEGORY_OF[f])) s = Math.max(s, 6);
    if (d.desc.includes(f)) s = Math.max(s, 3);
    else if (f.length >= 4 && d.desc.some((w) => w.startsWith(f))) s = Math.max(s, 2);
  }
  return s;
}

export interface SearchResult {
  query: string;
  /** Set when typos were corrected, e.g. "neckless" → "necklace". */
  corrected?: string;
  results: Product[];
}

/**
 * Every query term must match somewhere (AND). Unknown terms are corrected to the closest
 * catalogue word (edit distance 1, or 2 for long words). Ranked by score, then in-stock, then featured.
 */
export function searchProducts(products: Product[], query: string): SearchResult {
  const q = query.trim().slice(0, 100);
  const terms = [...new Set(tokenize(q))].slice(0, 8);
  if (!terms.length) return { query: q, results: [] };

  const docs = index(products);
  const vocab = new Set<string>([...Object.keys(SYNONYMS), ...docs.flatMap((d) => [...d.name, ...d.tags])]);

  let corrected = false;
  const fixed = terms.map((t) => {
    if (MISSPELLINGS[t]) {
      corrected = true;
      return stem(MISSPELLINGS[t]);
    }
    if (vocab.has(t) || docs.some((d) => termScore(t, d) > 0) || t.length < 4 || /\d/.test(t)) return t;
    const max = t.length >= 7 ? 2 : 1;
    let best: string | null = null;
    let bestD = max + 1;
    for (const v of vocab) {
      const dist = distance(t, v, max);
      if (dist < bestD) [best, bestD] = [v, dist];
    }
    if (best) {
      corrected = true;
      return best;
    }
    return t;
  });

  const phrase = fixed.join(" ");
  const scored: { p: Product; s: number }[] = [];
  for (const d of docs) {
    let total = 0;
    let all = true;
    for (const t of fixed) {
      const s = termScore(t, d);
      if (!s) {
        all = false;
        break;
      }
      total += s;
    }
    if (!all) continue;
    if (fixed.length > 1 && d.nameText.includes(phrase)) total += 8; // exact phrase in the name
    scored.push({ p: d.p, s: total });
  }

  scored.sort((a, b) => b.s - a.s || Number(b.p.stock > 0) - Number(a.p.stock > 0) || Number(b.p.featured) - Number(a.p.featured));
  return { query: q, corrected: corrected ? phrase : undefined, results: scored.map((x) => x.p) };
}

/** Shown when the search box is empty, and as suggestions on "no results". */
export const POPULAR_SEARCHES = ["Diamond ring", "Pearl", "Gold hoops", "Bridal", "Bangle", "Pendant"];
