"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { SaleState } from "@/lib/sales";

export function SaleActions({ id, state, name }: { id: string; state: SaleState; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (body: unknown, method = "PATCH", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await api(`/api/admin/sales/${id}`, body, method);
      router.refresh();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const btn = "text-[12px] uppercase tracking-[0.12em] text-secondary transition-colors hover:text-ivory disabled:opacity-40";
  return (
    <div className="flex items-center justify-end gap-4">
      {state !== "ended" && <Link href={`/admin/sales/${id}`} className={btn}>Edit</Link>}
      {(state === "live" || state === "scheduled") && <button disabled={busy} onClick={() => run({ active: false })} className={btn}>Pause</button>}
      {state === "paused" && <button disabled={busy} onClick={() => run({ active: true })} className={btn}>Resume</button>}
      {state === "live" && <button disabled={busy} onClick={() => run({ endNow: true }, "PATCH", `End “${name}” now? Prices go back to normal immediately.`)} className={btn}>End now</button>}
      <button disabled={busy} onClick={() => run(undefined, "DELETE", `Delete “${name}”? This can't be undone.`)} className={`${btn} hover:!text-error`}>Delete</button>
    </div>
  );
}
