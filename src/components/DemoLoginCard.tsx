"use client";

import { ArrowRight } from "./Icons";

export const DEMO_LOGIN_EVENT = "aurelia:demo-login";
export type DemoLoginDetail = { email: string; password: string };

/** A demo account the visitor can click to fill the sign-in form (AuthForm listens for the event). */
export function DemoLoginCard({ title, email, password }: { title: string; email: string; password: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent<DemoLoginDetail>(DEMO_LOGIN_EVENT, { detail: { email, password } }))}
      className="group flex w-full items-center justify-between gap-3 border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-gold"
      aria-label={`Fill the sign-in form with the ${title} account`}
    >
      <span className="min-w-0">
        <span className="block font-medium text-ivory">{title}</span>
        <span className="mt-1 block break-all font-mono text-[12px] leading-relaxed text-secondary">{email}</span>
        <span className="block font-mono text-[12px] leading-relaxed text-secondary">{password}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-gold">
        Use <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
