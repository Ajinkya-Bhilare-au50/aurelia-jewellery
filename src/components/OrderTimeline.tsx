import { STATUS_FLOW, STATUS_LABEL, formatDate } from "@/lib/format";
import type { OrderStatus, TimelineEntry } from "@/lib/types";
import { CancelledIcon, HomeIcon, HourglassIcon, PackageCheckIcon, PinIcon, SuccessIcon, TruckIcon, type IconProps } from "./Icons";

const STATUS_ICON: Record<OrderStatus, (p: IconProps) => React.JSX.Element> = {
  pending_payment: HourglassIcon,
  confirmed: SuccessIcon,
  packed: PackageCheckIcon,
  shipped: TruckIcon,
  out_for_delivery: PinIcon,
  delivered: HomeIcon,
  cancelled: CancelledIcon,
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "delivered" ? "bg-success/10 text-success" :
    status === "cancelled" ? "bg-error/10 text-error" :
    status === "pending_payment" ? "bg-ivory/5 text-secondary" : "bg-gold/10 text-gold";
  const Icon = STATUS_ICON[status];
  return <span className={`badge ${tone} inline-flex items-center gap-1.5`}><Icon size={12} strokeWidth={1.8} />{STATUS_LABEL[status]}</span>;
}

/** Horizontal progress + detailed vertical history. */
export function OrderTimeline({ status, timeline, courier, awb }: { status: OrderStatus; timeline: TimelineEntry[]; courier?: string; awb?: string }) {
  const reached = STATUS_FLOW.indexOf(status);
  return (
    <div>
      {status !== "cancelled" && status !== "pending_payment" && (
        <ol className="grid grid-cols-5" aria-label="Delivery progress">
          {STATUS_FLOW.map((s, i) => {
            const done = i <= reached;
            const Icon = STATUS_ICON[s];
            return (
              <li key={s} className="relative flex flex-col items-center text-center" aria-current={i === reached ? "step" : undefined}>
                {i > 0 && <span className={`absolute right-1/2 top-[17px] h-px w-full ${i <= reached ? "bg-gold" : "bg-border"}`} />}
                <span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border ${done ? "border-gold bg-gold text-background" : "border-border bg-surface text-muted"} ${i === reached ? "ring-4 ring-gold/20" : ""}`}>
                  <Icon size={16} strokeWidth={done ? 1.9 : 1.5} />
                </span>
                <span className={`mt-3 px-1 text-[10px] uppercase leading-tight tracking-[0.1em] sm:text-[11px] ${done ? "text-ivory" : "text-muted"}`}>{STATUS_LABEL[s].replace("Order ", "")}</span>
              </li>
            );
          })}
        </ol>
      )}

      {courier && awb && (
        <p className="mt-8 flex items-center gap-3 border border-border bg-surface px-5 py-4 text-sm">
          <TruckIcon size={18} className="shrink-0 text-gold" />
          Shipped with <strong className="font-medium">{courier}</strong> · AWB <span className="font-mono tracking-wide">{awb}</span>
        </p>
      )}

      <ul className="mt-8 space-y-0">
        {[...timeline].reverse().map((t, i) => (
          <li key={`${t.status}-${t.at}`} className="relative flex gap-5 pb-6 pl-1 last:pb-0">
            <span className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? "bg-gold ring-4 ring-gold/15" : "bg-border"}`} />
            {i < timeline.length - 1 && <span className="absolute left-[9px] top-4 h-full w-px bg-border" />}
            <div>
              <p className="text-sm font-medium">{t.title ?? STATUS_LABEL[t.status]}</p>
              <p className="text-[12px] text-secondary">{formatDate(t.at, true)}</p>
              {t.note && <p className="mt-1 text-sm text-secondary">{t.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
