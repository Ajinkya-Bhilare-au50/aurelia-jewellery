"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { EmailOtpField } from "./EmailOtpField";
import { KeyIcon, MailIcon, MobileIcon } from "./Icons";
import { PhoneOtpField } from "./PhoneOtpField";
import { canViewAdmin } from "@/lib/roles";

type AuthRes = { user: { role: string } };

type Method = "otp" | "emailOtp" | "email";
const LABELS: Record<Method, string> = { otp: "Mobile OTP", emailOtp: "Email OTP", email: "Password" };

export function AuthForm({ mode, emailOtp = false }: { mode: "login" | "register"; emailOtp?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<Method>(emailOtp && params.get("method") === "email" ? "emailOtp" : "otp");
  const [phoneToken, setPhoneToken] = useState("");

  const isLogin = mode === "login";
  const q = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  function done(res: AuthRes) {
    router.replace(safeNext ?? (canViewAdmin(res.user.role) ? "/admin" : "/account"));
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLogin && !phoneToken) return setError("Please verify your mobile number with the OTP first.");
    setError("");
    setLoading(true);
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), ...(isLogin ? {} : { phoneToken }) };
    try {
      done(await api<AuthRes>(`/api/auth/${mode}`, data));
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  async function otpLogin(token: string) {
    setError("");
    setLoading(true);
    try {
      done(await api<AuthRes>("/api/auth/phone-login", { phoneToken: token }));
    } catch (err) {
      setLoading(false);
      throw err; // the OTP field shows the message and resets
    }
  }

  const footer = (
    <p className="text-center text-sm text-secondary">
      {isLogin ? "New to Aurelia? " : "Already have an account? "}
      <Link href={`/${isLogin ? "register" : "login"}${q}`} className="link text-ivory">{isLogin ? "Create an account" : "Sign in"}</Link>
    </p>
  );
  const alert = error && <p role="alert" className="border-l-2 border-error bg-error/5 px-4 py-3 text-sm text-error">{error}</p>;

  return (
    <div className="space-y-6">
      {isLogin && (
        <div className={`grid border-b border-border sm:flex ${emailOtp ? "grid-cols-3" : "grid-cols-2"}`} role="tablist">
          {(emailOtp ? (["otp", "emailOtp", "email"] as const) : (["otp", "email"] as const)).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => { setMethod(m); setError(""); }} className={`${method === m ? "tab tab-active" : "tab"} inline-flex items-center justify-center gap-2 px-2 tracking-[0.08em] sm:px-4 sm:tracking-[0.14em]`}>
              <span className="hidden sm:inline-flex">{m === "otp" ? <MobileIcon size={15} /> : m === "emailOtp" ? <MailIcon size={15} /> : <KeyIcon size={15} />}</span>
              {LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {isLogin && method === "otp" ? (
        <div className="space-y-5">
          <PhoneOtpField onVerified={otpLogin} verifyLabel={loading ? "Signing in…" : "Sign in"} />
          {alert}
          {footer}
        </div>
      ) : isLogin && method === "emailOtp" ? (
        <div className="space-y-5">
          <EmailOtpField onSignedIn={done} defaultReferral={params.get("ref") ?? ""} />
          {footer}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {!isLogin && emailOtp && (
            <p className="flex items-center gap-2 border border-border px-4 py-3 text-[13px] text-secondary">
              <MailIcon size={15} />
              <span>
                Prefer email?{" "}
                <Link href={`/login?method=email${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}${params.get("ref") ? `&ref=${encodeURIComponent(params.get("ref")!)}` : ""}`} className="link text-ivory">
                  Sign up with just an email code
                </Link>
              </span>
            </p>
          )}
          {!isLogin && (
            <div>
              <label htmlFor="name" className="field-label">Full name</label>
              <input id="name" name="name" required minLength={2} autoComplete="name" className="input" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          {!isLogin && <PhoneOtpField onVerified={(t) => setPhoneToken(t)} onReset={() => setPhoneToken("")} />}
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input id="password" name="password" type="password" required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? "current-password" : "new-password"} className="input" />
            {!isLogin && <p className="mt-2 text-[12px] text-secondary">At least 8 characters.</p>}
          </div>
          {!isLogin && (
            <div>
              <label htmlFor="referralCode" className="field-label">Referral code <span className="normal-case tracking-normal text-secondary">(optional)</span></label>
              <input id="referralCode" name="referralCode" defaultValue={params.get("ref") ?? ""} className="input uppercase" placeholder="e.g. AJINKYA10" />
              <p className="mt-2 text-[12px] text-secondary">Get 10% off your first order (up to ₹1,000).</p>
            </div>
          )}
          {alert}
          <button className="btn-primary w-full" disabled={loading || (!isLogin && !phoneToken)}>{loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</button>
          {footer}
        </form>
      )}
    </div>
  );
}
