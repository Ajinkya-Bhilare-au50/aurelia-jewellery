"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { RefreshIcon } from "./Icons";

const RESEND_AFTER = 30;
type AuthRes = { user: { role: string } };

/**
 * Passwordless sign-in: email → 6-digit code by email → signed in.
 * The server answers the same way whether or not the email has an account.
 */
export function EmailOtpField({ onSignedIn }: { onSignedIn: (res: AuthRes) => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [devCode, setDevCode] = useState("");
  const challenge = useRef("");
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    setError("");
    setBusy(true);
    try {
      const res = await api<{ challenge: string; devCode?: string }>("/api/auth/email-otp/send", { email: email.trim() });
      challenge.current = res.challenge;
      setDevCode(res.devCode ?? "");
      setStep("code");
      setCode("");
      setWait(RESEND_AFTER);
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    setError("");
    setBusy(true);
    try {
      onSignedIn(await api<AuthRes>("/api/auth/email-otp/verify", { challenge: challenge.current, code }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function change() {
    setStep("email");
    setCode("");
    setError("");
    setDevCode("");
  }

  const onKey = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div>
      <label htmlFor="otp-email" className="field-label">Email</label>
      <div className="flex gap-3">
        <input
          id="otp-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onKey(send)}
          disabled={step !== "email" || busy}
          className="input min-w-0 flex-1"
          placeholder="you@example.com"
        />
        {step === "email" ? (
          <button type="button" onClick={send} disabled={busy} className="btn-secondary shrink-0">{busy ? "Sending…" : "Send code"}</button>
        ) : (
          <button type="button" onClick={change} disabled={busy} className="btn-tertiary shrink-0">Change</button>
        )}
      </div>
      {step === "email" && <p className="mt-2 text-[12px] text-secondary">We&apos;ll email you a 6-digit code. No password needed.</p>}

      {step === "code" && (
        <div className="mt-4">
          <label htmlFor="otp-email-code" className="field-label">Enter the 6-digit code</label>
          <div className="flex gap-3">
            <input
              ref={codeInput}
              id="otp-email-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={onKey(verify)}
              className="input min-w-0 flex-1 tracking-[0.5em]"
              placeholder="••••••"
            />
            <button type="button" onClick={verify} disabled={busy || code.length !== 6} className="btn-secondary shrink-0">{busy ? "Signing in…" : "Sign in"}</button>
          </div>
          <p className="mt-2 text-[12px] text-secondary">
            If an account exists for {email.trim()}, a code is on its way (check spam too). It expires in 10 minutes.{" "}
            {wait > 0 ? <>Resend in {wait}s</> : <button type="button" onClick={send} className="inline-flex items-center gap-1.5 text-ivory transition-colors hover:text-gold"><RefreshIcon size={13} /> Resend code</button>}
          </p>
          {devCode && <p className="mt-2 text-[12px] text-warning">Dev mode (no email configured): your code is {devCode}</p>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}
