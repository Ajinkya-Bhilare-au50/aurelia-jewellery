"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { LogoutIcon } from "./Icons";

export function LogoutButton({ className, withIcon = false }: { className?: string; withIcon?: boolean }) {
  const router = useRouter();
  return (
    <button
      className={className ?? (withIcon ? "flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-secondary transition-colors hover:text-ivory" : "text-[12px] uppercase tracking-[0.14em] link")}
      onClick={async () => {
        await api("/api/auth/logout", {});
        router.push("/");
        router.refresh();
      }}
    >
      {withIcon && <LogoutIcon size={16} />}
      Sign out
    </button>
  );
}
