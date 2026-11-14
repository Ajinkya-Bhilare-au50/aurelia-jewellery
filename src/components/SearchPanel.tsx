"use client";

import Image from "@/components/Img";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CATEGORY_LABEL, formatINR } from "@/lib/format";
import { POPULAR_SEARCHES } from "@/lib/search";
import type { Category } from "@/lib/types";
import { ArrowRight, ClockIcon, CloseIcon, SearchIcon } from "./Icons";

type Hit = { id: string; slug: string; name: string; image: string; price: number; compareAtPrice?: number; category: Category; metal: string; soldOut: boolean; sale?: string };
type Res = { query: string; corrected?: string; total: number; results: Hit[] };

const RECENT_KEY = "aurelia_recent_searches";
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5);
  } catch {
    return [];
  }
};
const saveRecent = (q: string) => {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
};

/** Header search: instant suggestions (debounced, cancellable), recent + popular searches, full keyboard/ARIA combobox. */
export function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(readRecent());
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced fetch; aborts stale requests so results never arrive out of order.
  useEffect(() => {
    const term = q.trim();
    setActive(-1);
    if (term.length < 2) {
      setRes(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Res | null) => {
          setRes(d);
          setLoading(false);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string, term?: string) => {
    if (term) saveRecent(term);
    onClose();
    router.push(href);
  };
  const searchAll = (term = q.trim()) => term && go(`/shop?q=${encodeURIComponent(term)}`, term);

  const hits = res?.results ?? [];
  const optionCount = hits.length + (res && res.total > 0 ? 1 : 0); // products + "see all"

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && optionCount) {
      e.preventDefault();
      setActive((a) => (a + 1) % optionCount);
    } else if (e.key === "ArrowUp" && optionCount) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? optionCount - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < hits.length) go(`/product/${hits[active].slug}`, q.trim());
      else searchAll();
    }
  }

  const showSuggestions = q.trim().length < 2;
  const chip = "inline-flex items-center gap-2 border border-border px-3 py-1.5 text-[12px] text-secondary transition-colors hover:border-gold hover:text-ivory";

  return (
    <div className="absolute inset-x-0 top-full border-b border-border bg-surface-elevated shadow-2xl animate-fade">
      <form role="search" onSubmit={(e) => { e.preventDefault(); searchAll(); }} className="container-page flex h-16 items-center gap-4">
        <SearchIcon className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={100}
          placeholder="Search rings, pearls, hoops…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent font-display text-xl text-ivory placeholder:text-muted focus:outline-none"
        />
        {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-label="Searching" />}
        <button type="button" aria-label="Close search" onClick={onClose} className="icon-btn -mr-3 text-secondary"><CloseIcon /></button>
      </form>

      <div className="container-page max-h-[70vh] overflow-y-auto pb-6">
        {showSuggestions ? (
          <div className="space-y-5 border-t border-border pt-5">
            {recent.length > 0 && (
              <div>
                <p className="label">Recent</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recent.map((r) => <button key={r} type="button" onClick={() => searchAll(r)} className={chip}><ClockIcon size={13} />{r}</button>)}
                  <button type="button" onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch {} setRecent([]); }} className="px-2 text-[12px] text-muted hover:text-ivory">Clear</button>
                </div>
              </div>
            )}
            <div>
              <p className="label">Popular</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((t) => <button key={t} type="button" onClick={() => searchAll(t)} className={chip}>{t}</button>)}
              </div>
            </div>
          </div>
        ) : res && res.total === 0 && !loading ? (
          <div className="border-t border-border pt-5 text-sm text-secondary">
            No pieces match <span className="text-ivory">“{res.query}”</span>. Try{" "}
            {POPULAR_SEARCHES.slice(0, 3).map((t, i) => (
              <span key={t}>{i > 0 && ", "}<button type="button" onClick={() => searchAll(t)} className="link text-ivory">{t.toLowerCase()}</button></span>
            ))}.
          </div>
        ) : (
          hits.length > 0 && (
            <div className="border-t border-border pt-3">
              {res?.corrected && <p className="pb-2 text-[12px] text-secondary">Showing results for <span className="text-ivory">“{res.corrected}”</span></p>}
              <ul id={listId} role="listbox" aria-label="Suggestions">
                {hits.map((h, i) => (
                  <li
                    key={h.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(`/product/${h.slug}`, q.trim())}
                    className={`flex cursor-pointer items-center gap-4 px-2 py-2.5 transition-colors ${active === i ? "bg-surface-muted" : ""}`}
                  >
                    <span className={`relative h-14 w-12 shrink-0 overflow-hidden bg-surface ${h.soldOut ? "opacity-50" : ""}`}><Image src={h.image} alt="" fill sizes="48px" className="object-cover" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-ivory">{h.name}</span>
                      <span className="block text-[12px] text-muted">{CATEGORY_LABEL[h.category]} · {h.metal}{h.sale && <span className="text-gold"> · {h.sale}</span>}{h.soldOut && <span className="text-error"> · Sold out</span>}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      <span className="block text-gold">{formatINR(h.price)}</span>
                      {h.compareAtPrice && <span className="block text-[12px] text-muted line-through">{formatINR(h.compareAtPrice)}</span>}
                    </span>
                  </li>
                ))}
                <li
                  id={`${listId}-${hits.length}`}
                  role="option"
                  aria-selected={active === hits.length}
                  onMouseEnter={() => setActive(hits.length)}
                  onClick={() => searchAll()}
                  className={`mt-1 flex cursor-pointer items-center justify-between border-t border-border px-2 py-3 text-[12px] font-medium uppercase tracking-[0.14em] ${active === hits.length ? "bg-surface-muted text-ivory" : "text-gold"}`}
                >
                  See all {res!.total} result{res!.total === 1 ? "" : "s"} for “{res!.query.trim()}” <ArrowRight size={16} />
                </li>
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
}
