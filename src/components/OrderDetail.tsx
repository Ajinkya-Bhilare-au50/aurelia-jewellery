import Image from "@/components/Img";
import Link from "next/link";
import { formatDate, formatINR } from "@/lib/format";
import type { Order, RefundStatus } from "@/lib/types";
import { RetryRefundButton } from "./admin/RetryRefundButton";
import { CancelledIcon, ClockIcon, SuccessIcon, WarningIcon } from "./Icons";
import { OrderTimeline, StatusBadge } from "./OrderTimeline";

const REFUND_LABEL: Record<RefundStatus, string> = { pending: "Processing", processed: "Refunded", failed: "Needs attention" };
const REFUND_TONE: Record<RefundStatus, string> = { pending: "text-warning", processed: "text-success", failed: "text-error" };

/** Shared by the customer order page and the admin order page. */
export function OrderDetail({ order, aside, admin = false }: { order: Order; aside?: React.ReactNode; admin?: boolean }) {
  const a = order.address;
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="space-y-10 lg:col-span-7">
        <section className="card p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl">Tracking</h2>
            <StatusBadge status={order.status} />
          </div>
          <OrderTimeline status={order.status} timeline={order.timeline} courier={order.courier} awb={order.awb} />
        </section>
        <section>
          <h2 className="font-display text-2xl">Items</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {order.items.map((i, idx) => {
              const cancelled = i.cancelledQty ?? 0;
              const all = cancelled >= i.qty;
              return (
                <li key={`${idx}-${i.productId}-${i.size ?? ""}`} className="flex items-center gap-5 py-4">
                  <div className={`relative h-20 w-16 shrink-0 overflow-hidden bg-surface ${all ? "opacity-40 grayscale" : ""}`}><Image src={i.image} alt={i.name} fill sizes="64px" className="object-cover" /></div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${i.slug}`} className={`font-display text-lg hover:text-gold ${all ? "text-secondary line-through decoration-1" : ""}`}>{i.name}</Link>
                    <p className="text-[13px] text-secondary">
                      {i.listPrice && i.listPrice > i.price && <span className="mr-1.5 line-through">{formatINR(i.listPrice)}</span>}
                      {formatINR(i.price)} × {i.qty}{i.size && ` · Size ${i.size}`}
                      {i.saleName && <span className="ml-2 text-gold">· {i.saleName}</span>}
                    </p>
                    {cancelled > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-error">
                        <CancelledIcon size={12} strokeWidth={1.8} /> {all ? "Cancelled" : `${cancelled} of ${i.qty} cancelled`}
                      </p>
                    )}
                  </div>
                  <p className={`tabular-nums ${all ? "text-secondary line-through" : ""}`}>{formatINR(i.price * i.qty)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <aside className="space-y-6 lg:col-span-5">
        {aside}
        <section className="bg-surface p-6 lg:p-8">
          <h2 className="font-display text-2xl">Payment</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatINR(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-success"><dt>{order.discountLabel}</dt><dd className="tabular-nums">− {formatINR(order.discount)}</dd></div>}
            <div className="flex justify-between text-secondary"><dt>Shipping</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div>
            <div className="flex items-baseline justify-between border-t border-border pt-3"><dt className="label !text-ivory">Total</dt><dd className="font-display text-2xl tabular-nums">{formatINR(order.total)}</dd></div>
            {order.refunds.map((r) => (
              <div key={r.id} className="flex justify-between gap-4">
                <dt className="min-w-0">
                  <span className="block">Refund · {r.description}</span>
                  <span className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${REFUND_TONE[r.status]}`}>
                    {r.status === "processed" ? <SuccessIcon size={12} /> : r.status === "failed" ? <WarningIcon size={12} /> : <ClockIcon size={12} />}
                    {REFUND_LABEL[r.status]} · {formatDate(r.at)}
                  </span>
                  {admin && r.status === "failed" && <RetryRefundButton orderId={order.id} refundId={r.id} error={r.error} />}
                </dt>
                <dd className="shrink-0 tabular-nums text-success">− {formatINR(r.amount)}</dd>
              </div>
            ))}
            {order.refundedAmount > 0 && (
              <div className="flex items-baseline justify-between border-t border-border pt-3"><dt className="label !text-ivory">Net paid</dt><dd className="font-display text-xl tabular-nums">{formatINR(order.total - order.refundedAmount)}</dd></div>
            )}
          </dl>
          <p className="mt-4 text-[12px] text-secondary">
            {order.payment.paymentId ? `Paid via ${order.payment.provider === "demo" ? "demo payment" : "Razorpay"} · ${order.payment.paymentId}` : "Not paid yet"}
          </p>
        </section>
        <section className="card p-6 lg:p-8">
          <h2 className="font-display text-2xl">Delivering to</h2>
          <address className="mt-4 text-sm not-italic leading-relaxed text-secondary">
            <span className="text-ivory">{a.name}</span><br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.city}, {a.state} {a.pincode}<br />+91 {a.phone}
          </address>
          <p className="mt-4 text-[12px] text-secondary">Placed {formatDate(order.createdAt, true)}</p>
        </section>
      </aside>
    </div>
  );
}
