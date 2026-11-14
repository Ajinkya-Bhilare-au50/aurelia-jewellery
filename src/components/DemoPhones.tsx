import { DEMO_ADMIN, DEMO_CUSTOMER, DEMO_LOGIN_PHONES, DEMO_OTP, DEMO_SIGNUP_PHONES } from "@/lib/demo";
import { DemoLoginCard } from "./DemoLoginCard";
import { MOBILE_OTP } from "@/lib/features";
import { InfoIcon, MobileIcon } from "./Icons";

/** "Try it" box for the demo deployment: Firebase test numbers with a fixed OTP (no SMS sent). */
export function DemoPhones({ mode, realSms = false }: { mode: "login" | "register"; realSms?: boolean }) {
  const phones = mode === "login" ? DEMO_LOGIN_PHONES : DEMO_SIGNUP_PHONES;
  const accounts = (
    <>
      <p className="font-medium text-ivory">Try the demo: tap an account to fill the form</p>
      <div className="mt-3 space-y-2">
        <DemoLoginCard title="Demo customer" email={DEMO_CUSTOMER.email} password={DEMO_CUSTOMER.password} />
        <DemoLoginCard title="Admin panel (read-only)" email={DEMO_ADMIN.email} password={DEMO_ADMIN.password} />
      </div>
      <p className="mt-3 flex items-start gap-2 text-[12px] text-muted">
        <InfoIcon size={14} className="mt-0.5 shrink-0" />
        The demo customer is shared by everyone, so please don&apos;t enter a real address or personal details.
      </p>
    </>
  );
  if (!MOBILE_OTP) {
    if (mode !== "login") return null;
    return <div className="mt-10 border border-dashed border-gold/50 bg-gold/5 p-5 text-[13px] text-secondary">{accounts}</div>;
  }
  return (
    <div className="mt-10 border border-dashed border-gold/50 bg-gold/5 p-5 text-[13px] text-secondary">
      <p className="flex items-center gap-2 font-medium text-ivory">
        <MobileIcon size={16} className="text-gold" />
        {mode === "login" ? "Try mobile OTP sign-in" : "Try sign-up with a demo number"}
      </p>
      <p className="mt-2">
        {mode === "login"
          ? "This is a demo store. Choose Mobile OTP and use any of these numbers:"
          : realSms
            ? "Use your own mobile number (you'll get a real SMS), or one of these demo numbers (each can be registered once):"
            : "Real SMS is off in this demo. Verify your mobile with one of these numbers (each can be registered once):"}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Demo mobile numbers">
        {phones.map((p) => (
          <li key={p} className="border border-border bg-surface px-2.5 py-1 font-mono text-[12px] tabular-nums text-ivory">+91 {p}</li>
        ))}
      </ul>
      <p className="mt-3">
        OTP for all: <span className="font-mono text-[13px] font-semibold tracking-[0.2em] text-gold">{DEMO_OTP}</span>
      </p>
      {mode === "login" && (
        <div className="mt-4 border-t border-border pt-4">{accounts}</div>
      )}
      <p className="mt-3 flex items-start gap-2 text-[12px] text-muted">
        <InfoIcon size={14} className="mt-0.5 shrink-0" />
        {mode === "login"
          ? "These are shared demo accounts that anyone can open, so please don't enter a real address or personal details."
          : "If a number is already taken, try the next one, or sign in on the login page with a demo account."}
      </p>
    </div>
  );
}
