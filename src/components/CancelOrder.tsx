"use client";

import Image from "@/components/Img";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CANCEL_REASONS, ITEMS_CANCELLABLE, activeQty, activeUnits, isPaid, itemsRefund, remainingRefund, type CancelLine } from "@/lib/cancellation";
import { api } from "@/lib/client";
import { formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";
import { CancelledIcon, CloseIcon, WarningIcon } from "./Icons";
import { QtyStepper } from "./QtyStepper";

type Mode = "order" | "items";

/** "Need to make a change?" card + cancellation dialog for the customer's order page. */
export function CancelOrder({ order, admin = false }: { order: Order; admin?: boolean }) {
  const [open, setOpen] = useState<Mode | null>(null);
  const canItems = ITEMS_CANCELLABLE.includes(order.status) && activeUnits(order) > 1;
  return (
    <section className="card p-6 lg:p-8">
      <h2 className="font-display text-2xl">{admin ? "Cancel & refund" : "Need to make a change?"}</h2>
      <p className="mt-2 text-sm text-secondary">
        {admin
          ? "Cancel the order or individual items. Paid amounts are refunded automatically and stock is restored; the customer is emailed."
          : order.status === "pending_payment"
            ? "This order hasn't been paid yet. You can cancel it at no cost."
            : "You can cancel this order, or individual items, until it ships. Refunds go back to your original payment method."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {canItems && <button type="button" onClick={() => setOpen("items")} className="btn-secondary btn-sm">Cancel items</button>}
        <button type="button" onClick={() => setOpen("order")} className="btn btn-sm border border-error/60 text-error transition-colors hover:bg-error/10">
          <CancelledIcon size={16} /> Cancel order
        </button>
      </div>
      {open && <CancelDialog order={order} initialMode={open} canItems={canItems} onClose={() => setOpen(null)} />}
    </section>
  );
}

function CancelDialog({ order, initialMode, canItems, onClose }: { order: Order; initialMode: Mode; canItems: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [picked, setPicked] = useState<Record<number, number>>({}); // line index → qty to cancel
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  const lines: CancelLine[] = useMemo(() => Object.entries(picked).map(([index, qty]) => ({ index: Number(index), qty })), [picked]);
  const unitsPicked = lines.reduce((n, l) => n + l.qty, 0);
  const becomesFull = mode === "order" || unitsPicked >= activeUnits(order);
  const refund = becomesFull ? remainingRefund(order) : itemsRefund(order, lines);
  const paid = isPaid(order);
  const ready = reason && (mode === "order" || unitsPicked > 0) && (reason !== "Other" || note.trim().length > 2);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/orders/${order.id}/cancel`, { reason, note: note.trim() || undefined, ...(mode === "items" ? { lines } : {}) });
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-title" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="relative my-8 w-full max-w-lg border border-border bg-surface p-6 sm:p-8">
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center text-secondary hover:text-ivory"><CloseIcon size={18} /></button>
        <h2 id="cancel-title" className="font-display text-2xl">Cancel {mode === "order" ? "order" : "items"} {order.number}</h2>

        {canItems && (
          <div className="mt-5 flex border-b border-border" role="tablist">
            {(["order", "items"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={mode === m ? "tab tab-active" : "tab"}>
                {m === "order" ? "Entire order" : "Select items"}
              </button>
            ))}
          </div>
        )}

        {mode === "items" ? (
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {order.items.map((it, index) => {
              const left = activeQty(it);
              if (left <= 0) return null;
              const on = picked[index] != null;
              return (
                <li key={index} className="flex items-center gap-4 py-3">
                  <input
                    type="checkbox"
                    id={`c-${index}`}
                    checked={on}
                    onChange={(e) => setPicked((p) => { const n = { ...p }; if (e.target.checked) n[index] = left; else delete n[index]; return n; })}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-gold"
                  />
                  <label htmlFor={`c-${index}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <span className="relative h-14 w-12 shrink-0 overflow-hidden bg-surface-muted"><Image src={it.image} alt="" fill sizes="48px" className="object-cover" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{it.name}</span>
                      <span className="block text-[12px] text-secondary">{formatINR(it.price)}{it.size && ` · Size ${it.size}`} · {left} active</span>
                    </span>
                  </label>
                  {on && left > 1 && <QtyStepper small value={picked[index]} max={left} onChange={(q) => setPicked((p) => ({ ...p, [index]: q }))} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-secondary">All remaining items in this order will be cancelled{paid ? " and returned to stock" : ""}.</p>
        )}

        <div className="mt-6">
          <label htmlFor="cancel-reason" className="field-label">Reason for cancelling</label>
          <select id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input cursor-pointer">
            <option value="" disabled>Choose a reason</option>
            {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          {reason === "Other" && (
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Tell us a little more" aria-label="Other reason" className="input mt-3" />
          )}
        </div>

        <div className="mt-6 border border-border bg-background/40 p-4 text-sm">
          {paid ? (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-secondary">Refund to original payment method</span>
                <span className="font-display text-2xl tabular-nums">{formatINR(refund)}</span>
              </div>
              <p className="mt-1 text-[12px] text-secondary">
                Usually 5–7 business days, depending on your bank.
                {!becomesFull && order.discount > 0 && " Your order discount is shared across items, so the refund reflects what you paid for them."}
                {becomesFull && order.shipping > 0 && " Includes shipping."}
              </p>
            </>
          ) : (
            <p className="text-secondary">No payment was taken for this order, so nothing will be charged.</p>
          )}
          {mode === "items" && becomesFull && unitsPicked > 0 && <p className="mt-2 flex items-center gap-2 text-[12px] text-warning"><WarningIcon size={14} /> This cancels everything left in the order.</p>}
        </div>

        {error && <p role="alert" className="mt-4 text-[13px] text-error">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="btn-tertiary">Keep my order</button>
          <button type="button" onClick={confirm} disabled={!ready || busy} className="btn border border-error bg-error/15 text-error transition-colors hover:bg-error/25 disabled:opacity-40">
            {busy ? "Cancelling…" : becomesFull ? "Cancel order" : `Cancel ${unitsPicked} item${unitsPicked === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
