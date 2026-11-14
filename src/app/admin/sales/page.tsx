import Link from "next/link";
import { AdminHeader, Table, td } from "@/components/admin/AdminTable";
import { SaleActions } from "@/components/admin/SaleActions";
import { SaleIcon } from "@/components/Icons";
import { listProducts, prisma, toSale } from "@/lib/db";
import { CATEGORY_LABEL, formatDate } from "@/lib/format";
import { describeSale, saleApplies, saleState, type SaleState } from "@/lib/sales";

export const metadata = { title: "Sales" };

const STATE: Record<SaleState, [string, string]> = {
  live: ["Live", "bg-success/10 text-success"],
  scheduled: ["Scheduled", "bg-gold/10 text-gold"],
  paused: ["Paused", "bg-ivory/5 text-secondary"],
  ended: ["Ended", "bg-ivory/5 text-muted"],
};

export default async function AdminSales() {
  const [rows, products] = await Promise.all([prisma.sale.findMany({ orderBy: { startsAt: "desc" } }), listProducts()]);
  const sales = rows.map(toSale);
  const now = Date.now();
  const live = sales.filter((s) => saleState(s, now) === "live");

  return (
    <>
      <AdminHeader
        title="Sales"
        subtitle={live.length ? `${live.length} sale${live.length > 1 ? "s" : ""} live now` : "Automatic, scheduled price drops (e.g. Diwali)"}
        action={<Link href="/admin/sales/new" className="btn-primary btn-sm"><SaleIcon size={16} /> New sale</Link>}
      />
      {sales.length === 0 ? (
        <div className="card flex flex-col items-center p-12 text-center">
          <SaleIcon size={32} className="text-gold" />
          <p className="mt-4 font-display text-2xl">No sales yet</p>
          <p className="mt-2 max-w-md text-sm text-secondary">Create a Diwali sale in a minute: choose a discount, what it applies to and when it runs. Prices change automatically at the start and end time.</p>
          <Link href="/admin/sales/new" className="btn-primary mt-6">Create a Diwali sale</Link>
        </div>
      ) : (
        <Table head={["Sale", "Discount", "Applies to", "Runs", "Status", ""]}>
          {sales.map((s) => {
            const state = saleState(s, now);
            const count = products.filter((p) => saleApplies(s, p)).length;
            return (
              <tr key={s.id} className={state === "ended" ? "text-secondary" : ""}>
                <td className={td}>
                  <p className="font-medium">{s.name}</p>
                  {s.bannerText && <p className="max-w-[260px] truncate text-[12px] text-secondary">{s.bannerText}</p>}
                </td>
                <td className={td}>
                  {describeSale(s)}
                  {!s.stackWithCoupons && <p className="text-[12px] text-secondary">No coupons</p>}
                </td>
                <td className={td}>
                  {s.scope === "all" ? "All products" : s.scope === "categories" ? s.categories.map((c) => CATEGORY_LABEL[c]).join(", ") : "Selected products"}
                  <p className="text-[12px] text-secondary">{count} product{count === 1 ? "" : "s"}</p>
                </td>
                <td className={`${td} text-[13px]`}>
                  {formatDate(s.startsAt, true)}
                  <p className="text-secondary">→ {formatDate(s.endsAt, true)}</p>
                </td>
                <td className={td}><span className={`badge ${STATE[state][1]}`}>{STATE[state][0]}</span></td>
                <td className={td}><SaleActions id={s.id} state={state} name={s.name} /></td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-6 text-[12px] text-secondary">
        If several live sales cover the same product, the customer gets the biggest discount. Prices always revert automatically when a sale ends.
      </p>
    </>
  );
}
