import Link from "next/link";
import { AdminHeader, Table, td } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/OrderTimeline";
import { Avatar } from "@/components/Avatar";
import { AwardIcon, CardIcon, PackageCheckIcon, UsersIcon } from "@/components/Icons";
import { customerSelect, prisma, toCustomer, toOrder, toProduct } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { getUser } from "@/lib/auth";
import { maskName, maskOrder } from "@/lib/privacy";
import { isDemoAdmin } from "@/lib/roles";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const paidWhere = { status: { notIn: ["pending_payment", "cancelled"] } };
  const [agg, customers, toFulfil, lowStockRows, recentRows] = await Promise.all([
    prisma.order.aggregate({ where: paidWhere, _sum: { total: true, refundedAmount: true }, _count: true }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.order.count({ where: { status: { in: ["confirmed", "packed"] } } }),
    prisma.product.findMany({ where: { stock: { lte: 3 } }, orderBy: { stock: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: customerSelect } }),
  ]);
  const revenue = (agg._sum.total ?? 0) - (agg._sum.refundedAmount ?? 0); // net of partial-cancellation refunds
  const paid = { length: agg._count };
  const lowStock = lowStockRows.map(toProduct);
  const readOnly = isDemoAdmin((await getUser())?.role);
  const recent = recentRows.map((r) => {
    const o = { ...toOrder(r), customer: toCustomer(r.user) };
    return readOnly ? { ...maskOrder(o), customer: { ...o.customer, name: maskName(o.customer.name), avatarUrl: undefined } } : o;
  });

  const stats = [
    ["Revenue", formatINR(revenue), CardIcon],
    ["Paid orders", String(paid.length), PackageCheckIcon],
    ["Avg. order value", paid.length ? formatINR(Math.round(revenue / paid.length)) : "—", AwardIcon],
    ["Customers", String(customers), UsersIcon],
  ] as const;

  return (
    <>
      <AdminHeader title="Overview" subtitle={toFulfil ? `${toFulfil} order${toFulfil > 1 ? "s" : ""} waiting to be fulfilled` : "All orders are fulfilled"} />
      <dl className="grid grid-cols-2 gap-px border border-border bg-border xl:grid-cols-4">
        {stats.map(([k, v, Icon]) => (
          <div key={k} className="bg-surface p-6">
            <dt className="label flex items-center justify-between gap-2">{k}<Icon size={18} className="text-gold" /></dt>
            <dd className="mt-3 font-display text-[34px] leading-none tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-10 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Recent orders</h2>
            <Link href="/admin/orders" className="text-[12px] uppercase tracking-[0.14em] link">All orders</Link>
          </div>
          {recent.length ? (
            <Table head={["Order", "Customer", "Date", "Status", "Total"]}>
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-surface-elevated/60">
                  <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold">{o.number}</Link></td>
                  <td className={td}>
                    <span className="flex items-center gap-3"><Avatar id={o.customer.id} name={o.customer.name} src={o.customer.avatarUrl} size="xs" />{o.address.name}</span>
                  </td>
                  <td className={`${td} text-secondary`}>{formatDate(o.createdAt)}</td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                  <td className={`${td} text-right tabular-nums`}>{formatINR(o.total)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="card p-8 text-center text-sm text-secondary">No orders yet. Place one from the storefront to see it here.</p>
          )}
        </section>
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Low stock</h2>
            <Link href="/admin/products" className="text-[12px] uppercase tracking-[0.14em] link">Products</Link>
          </div>
          <ul className="card divide-y divide-border">
            {lowStock.length === 0 && <li className="p-5 text-sm text-secondary">Everything is well stocked.</li>}
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <Link href={`/admin/products/${p.id}`} className="hover:text-gold">{p.name}</Link>
                <span className={`badge ${p.stock === 0 ? "bg-error/10 text-error" : "bg-gold/10 text-gold"}`}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
