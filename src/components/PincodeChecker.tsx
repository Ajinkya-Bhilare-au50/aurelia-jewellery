"use client";

import { useState } from "react";
import { PinIcon } from "./Icons";

/**
 * Delivery estimate by PIN code. Integration point: replace `estimate()` with your courier's
 * serviceability API (e.g. Shiprocket / Delhivery). Today it validates the PIN and shows a standard window.
 */
function estimate(pin: string) {
  const metro = /^(11|40|56|60|70|50)/.test(pin); // Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad
  const days = metro ? 3 : 5;
  const d = new Date(Date.now() + days * 864e5);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function PincodeChecker() {
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div>
      <label htmlFor="pin" className="field-label flex items-center gap-2"><PinIcon width={14} height={14} className="text-gold" /> Check delivery</label>
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault();
          setResult(/^[1-9]\d{5}$/.test(pin) ? { ok: true, text: `Estimated delivery by ${estimate(pin)} · free insured shipping` } : { ok: false, text: "Enter a valid 6-digit PIN code." });
        }}
      >
        <input id="pin" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setResult(null); }} inputMode="numeric" autoComplete="postal-code" placeholder="Enter PIN code" aria-invalid={result?.ok === false} className="input h-11 flex-1" />
        <button className="btn-secondary btn-sm h-11 border-l-0">Check</button>
      </form>
      {result && <p role="status" className={`mt-2 text-[13px] ${result.ok ? "text-success" : "text-error"}`}>{result.text}</p>}
    </div>
  );
}
