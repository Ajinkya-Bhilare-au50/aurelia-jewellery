"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { MobileIcon } from "./Icons";

const pretty = (p: string) => p.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");

/** Account page: add or change the mobile number (stored unverified while mobile OTP is off). */
export function MobileNumberCard({ phone }: { phone?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!phone);
  const [value, setValue] = useState(phone?.slice(3) ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const digits = value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) return setError("Enter a valid 10-digit mobile number.");
    setError("");
    setBusy(true);
    try {
      await api("/api/account/phone", { phone: digits });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-3 font-display text-2xl"><MobileIcon size={22} className="text-gold" /> Mobile number</h2>
      {!editing && phone ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[15px] tabular-nums text-ivory">{pretty(phone)}</p>
          <button type="button" onClick={() => setEditing(true)} className="btn-tertiary">Change</button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-4">
          <p className="mb-4 text-sm text-secondary">{phone ? "Update your number." : "Add your number so we can reach you about deliveries."}</p>
          <label htmlFor="acct-phone" className="field-label">Mobile number</label>
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 items-stretch">
              <span className="flex items-center border border-r-0 border-border bg-surface px-3 text-sm text-secondary">+91</span>
              <input id="acct-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={value} onChange={(e) => setValue(e.target.value)} className="input min-w-0 flex-1" placeholder="98765 43210" />
            </div>
            <button className="btn-secondary shrink-0" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </div>
          {phone && <button type="button" onClick={() => { setEditing(false); setValue(phone.slice(3)); setError(""); }} className="mt-2 text-[12px] text-secondary hover:text-ivory">Cancel</button>}
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}
