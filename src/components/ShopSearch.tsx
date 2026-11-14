"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "./Icons";

/**
 * In-page search for the shop toolbar. Searches within the current category and filters by
 * updating `?q=` (debounced; uses replace so typing doesn't flood browser history).
 */
export function ShopSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const typing = useRef(false);

  // Follow the URL when it changes from elsewhere (header search, back button, "clear").
  useEffect(() => {
    if (!typing.current) setQ(urlQ);
  }, [urlQ]);

  const apply = (value: string) => {
    typing.current = false;
    const next = new URLSearchParams(params);
    const v = value.trim();
    if (v) next.set("q", v);
    else next.delete("q");
    if (v === urlQ) return;
    const qs = next.toString(); // (URLSearchParams.size isn't supported on Safari < 17)
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Live results after a short pause in typing.
  useEffect(() => {
    if (!typing.current) return;
    const t = setTimeout(() => apply(q), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(q);
      }}
      className={`relative flex items-center ${className}`}
    >
      <SearchIcon size={16} className="pointer-events-none absolute left-3 text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          typing.current = true;
          setQ(e.target.value);
        }}
        maxLength={100}
        placeholder="Search in shop…"
        aria-label="Search products in the shop"
        className="input h-10 w-full pl-9 pr-9 text-[13px] [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button type="button" aria-label="Clear search" onClick={() => { setQ(""); apply(""); }} className="absolute right-1 grid h-8 w-8 place-items-center text-muted hover:text-ivory">
          <CloseIcon size={14} />
        </button>
      )}
    </form>
  );
}
