import Link from "next/link";
import { AdminHeader, Table, td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/OrderTimeline";
import { Avatar } from "@/components/Avatar";
import { customerSelect, prisma, toCustomer, toOrder } from "@/lib/db";
import { STATUS_LABEL, formatDate, formatINR } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };

const FILTERS: (OrderStatus | "")[] = ["", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "pending_payment", "cancelled"];

const PAGE_SIZE = 50;

export default async function AdminOrders({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const status = FILTERS.includes(searchParams.status as OrderStatus) ? searchParams.status : "";
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const [rows, groups] = await Promise.all([
    prisma.order.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, include: { user: customerSelect }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const orders = rows.map((r) => ({ ...toOrder(r), customer: toCustomer(r.user) }));
  const countFor = (f: string) => groups.reduce((n, g) => n + (!f || g.status === f ? g._count : 0), 0);
  const total = countFor(status ?? "");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => `/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <AdminHeader title="Orders" subtitle={`${total} order${total === 1 ? "" : "s"}${pages > 1 ? ` · page ${page} of ${pages}` : ""}`} />
      <div className="scroll-x mb-6 flex gap-1">
        {FILTERS.map((f) => (
          <Link key={f || "all"} href={f ? `/admin/orders?status=${f}` : "/admin/orders"} className={`whitespace-nowrap px-3 py-2 text-[11px] uppercase tracking-[0.12em] ${status === f ? "bg-gold text-background" : "text-secondary hover:text-ivory"}`}>
            {f ? STATUS_LABEL[f] : "All"} <span className="opacity-60">{countFor(f)}</span>
          </Link>
        ))}
      </div>
      <Table head={["Order", "Customer", "Items", "Date", "Status", "Total"]}>
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-surface-elevated/60">
            <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold">{o.number}</Link></td>
            <td className={td}>
              <div className="flex items-center gap-3">
                <Avatar id={o.customer.id} name={o.customer.name} src={o.customer.avatarUrl} size="sm" />
                <div>{o.address.name}<p className="text-[12px] text-secondary">{o.email}</p></div>
              </div>
            </td>
            <td className={td}>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
            <td className={`${td} text-secondary`}>{formatDate(o.createdAt, true)}</td>
            <td className={td}><StatusBadge status={o.status} /></td>
            <td className={`${td} text-right tabular-nums`}>{formatINR(o.total)}</td>
          </tr>
        ))}
        {orders.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-secondary">No orders in this view.</td></tr>}
      </Table>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-[12px] uppercase tracking-[0.12em]">
          {page > 1 ? <Link href={pageHref(page - 1)} className="text-secondary hover:text-ivory">← Newer</Link> : <span />}
          <span className="text-secondary">Page {page} of {pages}</span>
          {page < pages ? <Link href={pageHref(page + 1)} className="text-secondary hover:text-ivory">Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
