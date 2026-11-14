"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  if (state === "done")
    return <p role="status" className="alert-success mx-auto max-w-md text-left">Thank you. You&apos;ll hear about new collections first.</p>;
  return (
    <form
      className="mx-auto w-full max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("loading");
        setError("");
        try {
          await api("/api/newsletter", { email: new FormData(e.currentTarget).get("email") });
          setState("done");
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input id="newsletter-email" name="email" type="email" required placeholder="Your email address" autoComplete="email" className="input flex-1" />
        <button className="btn-primary shrink-0" disabled={state === "loading"}>{state === "loading" ? "Joining…" : "Subscribe"}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-left text-[13px] text-error">{error}</p>}
    </form>
  );
}
