"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { RefreshIcon } from "../Icons";

export function RetryRefundButton({ orderId, refundId, error }: { orderId: string; refundId: string; error?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span className="mt-1 block text-[12px]">
      {error && <span className="block text-secondary">{error}</span>}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            await api(`/api/admin/orders/${orderId}/refunds/${refundId}`, {});
            router.refresh();
          } catch (e) {
            setMsg((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="mt-1 inline-flex items-center gap-1.5 text-gold hover:text-gold-hover disabled:opacity-50"
      >
        <RefreshIcon size={12} className={busy ? "animate-spin" : ""} /> Retry refund
      </button>
      {msg && <span className="block text-error">{msg}</span>}
    </span>
  );
}
