"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/client";
import { RefreshIcon, SuccessIcon } from "./Icons";

// Which OTP path the browser uses: Firebase (SMS + reCAPTCHA in the browser) or our server endpoints (Authkey / dev).
const FIREBASE =
  process.env.NEXT_PUBLIC_OTP_PROVIDER !== "authkey" && Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const RESEND_AFTER = 30;

type Step = "phone" | "code" | "done";

/**
 * Mobile number + OTP. Calls `onVerified(token)` with a short-lived phone token that the
 * server checks (`verifyPhoneToken`). Uses Firebase Phone Auth when configured, otherwise
 * the dev-only endpoints that print the OTP to the server console.
 */
export function PhoneOtpField({
  onVerified,
  onReset,
  defaultPhone = "",
  verifyLabel = "Verify",
}: {
  onVerified: (token: string, phone: string) => void | Promise<void>;
  onReset?: () => void;
  defaultPhone?: string;
  verifyLabel?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const recaptchaId = `recaptcha-${uid}`;
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(defaultPhone);
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

  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const valid = /^[6-9]\d{9}$/.test(digits);

  async function send() {
    if (!valid) return setError("Enter a valid 10-digit mobile number.");
    setError("");
    setBusy(true);
    try {
      if (FIREBASE) {
        const { sendFirebaseOtp } = await import("@/lib/firebaseClient");
        await sendFirebaseOtp(`+91${digits}`, recaptchaId);
      } else {
        const res = await api<{ challenge: string; devCode?: string }>("/api/auth/otp/send", { phone: digits });
        challenge.current = res.challenge;
        setDevCode(res.devCode ?? "");
      }
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
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit OTP.");
    setError("");
    setBusy(true);
    let token: string;
    try {
      if (FIREBASE) {
        const { confirmFirebaseOtp } = await import("@/lib/firebaseClient");
        token = await confirmFirebaseOtp(code);
      } else {
        token = (await api<{ token: string }>("/api/auth/otp/verify", { challenge: challenge.current, code })).token;
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      return;
    }
    try {
      setStep("done");
      await onVerified(token, `+91${digits}`);
    } catch (err) {
      // The OTP was used up; start again from the number.
      setStep("phone");
      setDevCode("");
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function change() {
    setStep("phone");
    setCode("");
    setError("");
    setDevCode("");
    onReset?.();
  }

  // Enter inside these inputs must not submit a surrounding form.
  const onKey = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div>
      <label htmlFor={`phone-${uid}`} className="field-label">Mobile number</label>
      <div className="flex gap-3">
        <div className="flex flex-1 items-stretch">
          <span className="flex items-center border border-r-0 border-border bg-surface px-3 text-sm text-secondary">+91</span>
          <input
            id={`phone-${uid}`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={onKey(send)}
            disabled={step !== "phone" || busy}
            className="input flex-1"
            placeholder="98765 43210"
          />
        </div>
        {step === "phone" ? (
          <button type="button" onClick={send} disabled={busy} className="btn-secondary shrink-0">{busy ? "Sending…" : "Send OTP"}</button>
        ) : (
          <button type="button" onClick={change} disabled={busy} className="btn-tertiary shrink-0">Change</button>
        )}
      </div>

      {step === "code" && (
        <div className="mt-4">
          <label htmlFor={`otp-${uid}`} className="field-label">Enter the 6-digit OTP sent to +91 {digits}</label>
          <div className="flex gap-3">
            <input
              ref={codeInput}
              id={`otp-${uid}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={onKey(verify)}
              className="input flex-1 tracking-[0.5em]"
              placeholder="••••••"
            />
            <button type="button" onClick={verify} disabled={busy || code.length !== 6} className="btn-secondary shrink-0">{busy ? "Checking…" : verifyLabel}</button>
          </div>
          <p className="mt-2 text-[12px] text-secondary">
            Didn&apos;t get it?{" "}
            {wait > 0 ? <>Resend in {wait}s</> : <button type="button" onClick={send} className="inline-flex items-center gap-1.5 text-ivory transition-colors hover:text-gold"><RefreshIcon size={13} /> Resend OTP</button>}
          </p>
          {devCode && <p className="mt-2 text-[12px] text-warning">Dev mode (Firebase not configured): your OTP is {devCode}</p>}
        </div>
      )}

      {step === "done" && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-success"><SuccessIcon size={14} /> +91 {digits} verified</p>}
      {error && <p role="alert" className="mt-2 text-[13px] text-error">{error}</p>}
      <div id={recaptchaId} />
    </div>
  );
}
