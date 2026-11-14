"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { RefreshIcon, SuccessIcon } from "./Icons";

const RESEND_AFTER = 30;
type AuthRes = { user: { role: string } };
type VerifyRes = AuthRes | { signup: true; signupToken: string; email: string };

/**
 * Email → 6-digit code by email → signed in. A new email gets one more step (name, optional
 * referral code) and the account is created. The send step looks the same for every address.
 */
export function EmailOtpField({ onSignedIn, defaultReferral = "" }: { onSignedIn: (res: AuthRes) => void; defaultReferral?: string }) {
  const [step, setStep] = useState<"email" | "code" | "profile">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [referral, setReferral] = useState(defaultReferral);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [devCode, setDevCode] = useState("");
  const challenge = useRef("");
  const signupToken = useRef("");
  const codeInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const send = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    return run(async () => {
      const res = await api<{ challenge: string; devCode?: string }>("/api/auth/email-otp/send", { email: email.trim() });
      challenge.current = res.challenge;
      setDevCode(res.devCode ?? "");
      setStep("code");
      setCode("");
      setWait(RESEND_AFTER);
      setTimeout(() => codeInput.current?.focus(), 0);
    });
  };

  const verify = () => {
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    return run(async () => {
      const res = await api<VerifyRes>("/api/auth/email-otp/verify", { challenge: challenge.current, code });
      if ("signup" in res) {
        signupToken.current = res.signupToken;
        setStep("profile");
        setTimeout(() => nameInput.current?.focus(), 0);
      } else onSignedIn(res);
    });
  };

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Please enter your full name.");
    return run(async () => {
      onSignedIn(await api<AuthRes>("/api/auth/email-otp/signup", { signupToken: signupToken.current, name: name.trim(), referralCode: referral.trim() }));
    });
  };

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
        ) : step === "code" ? (
          <button type="button" onClick={change} disabled={busy} className="btn-tertiary shrink-0">Change</button>
        ) : null}
      </div>
      {step === "email" && <p className="mt-2 text-[12px] text-secondary">We&apos;ll email you a 6-digit code. No password needed. New here? The same code creates your account.</p>}

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
            <button type="button" onClick={verify} disabled={busy || code.length !== 6} className="btn-secondary shrink-0">{busy ? "Checking…" : "Continue"}</button>
          </div>
          <p className="mt-2 text-[12px] text-secondary">
            We sent a code to {email.trim()} (check spam too). It expires in 10 minutes.{" "}
            {wait > 0 ? <>Resend in {wait}s</> : <button type="button" onClick={send} className="inline-flex items-center gap-1.5 text-ivory transition-colors hover:text-gold"><RefreshIcon size={13} /> Resend code</button>}
          </p>
          {devCode && <p className="mt-2 text-[12px] text-warning">Dev mode (no email configured): your code is {devCode}</p>}
        </div>
      )}

      {step === "profile" && (
        <form onSubmit={createAccount} className="mt-4 space-y-5">
          <p className="flex items-center gap-1.5 text-[12px] text-success"><SuccessIcon size={14} /> Email verified. You&apos;re new here, so let&apos;s create your account.</p>
          <div>
            <label htmlFor="otp-name" className="field-label">Full name</label>
            <input ref={nameInput} id="otp-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" className="input" />
          </div>
          <div>
            <label htmlFor="otp-referral" className="field-label">Referral code <span className="normal-case tracking-normal text-secondary">(optional)</span></label>
            <input id="otp-referral" value={referral} onChange={(e) => setReferral(e.target.value)} maxLength={20} className="input uppercase" placeholder="e.g. AJINKYA10" />
            <p className="mt-2 text-[12px] text-secondary">Get 10% off your first order (up to ₹1,000).</p>
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}
