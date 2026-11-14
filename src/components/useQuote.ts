"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Quote } from "@/lib/pricing";
import { toCartPayload, useCart } from "./CartProvider";

/** Re-prices the cart on the server whenever lines or coupon change. */
export function useQuote() {
  const { lines, coupon, ready, syncPrices } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const payload = JSON.stringify(toCartPayload(lines));

  useEffect(() => {
    if (!ready) return;
    if (!lines.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<Quote>("/api/quote", { lines: JSON.parse(payload), couponCode: coupon || undefined })
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setError("");
        syncPrices(q.items); // keep line prices in step with live sale prices
      })
      .catch((e: Error) => !cancelled && (setQuote(null), setError(e.message)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, coupon, ready]);

  return { quote, error, loading };
}
