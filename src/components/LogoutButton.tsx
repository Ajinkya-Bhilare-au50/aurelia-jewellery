"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { LogoutIcon } from "./Icons";

export function LogoutButton({
  className,
  withIcon = false,
  iconSize = 16,
  tabIndex,
  onSignedOut,
}: {
  className?: string;
  withIcon?: boolean;
  iconSize?: number;
  tabIndex?: number;
  onSignedOut?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      disabled={busy}
      className={className ?? (withIcon ? "flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-secondary transition-colors hover:text-ivory" : "text-[12px] uppercase tracking-[0.14em] link")}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/auth/logout", {});
          onSignedOut?.();
          router.push("/");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {withIcon && <LogoutIcon size={iconSize} />}
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
