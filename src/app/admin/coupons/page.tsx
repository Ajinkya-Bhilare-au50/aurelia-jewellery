import { AdminHeader, Table, td } from "@/components/admin/AdminTable";
import { CouponActions, CouponCreateForm } from "@/components/admin/CouponManager";
import { Avatar } from "@/components/Avatar";
import { customerSelect, prisma, toCoupon, toCustomer } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { getUser } from "@/lib/auth";
import { maskName } from "@/lib/privacy";
import { isDemoAdmin } from "@/lib/roles";

export const metadata = { title: "Coupons" };

export default async function AdminCoupons() {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { owner: customerSelect } });
  const readOnly = isDemoAdmin((await getUser())?.role);
  const coupons = rows.map((r) => {
    const owner = r.owner ? toCustomer(r.owner) : null;
    return { ...toCoupon(r), owner: owner && readOnly ? { ...owner, name: maskName(owner.name), avatarUrl: undefined } : owner };
  });
  const now = Date.now();
  return (
    <>
      <AdminHeader title="Coupons" subtitle="Public codes and referral rewards" />
      <CouponCreateForm />
      <div className="mt-10">
        <Table head={["Code", "Discount", "Min order", "Used", "Expires", "Status", ""]}>
          {coupons.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt).getTime() < now;
            const owner = c.owner;
            return (
              <tr key={c.id} className={c.active && !expired ? "" : "text-secondary"}>
                <td className={td}>
                  <span className="font-mono font-semibold">{c.code}</span>
                  {owner && (
                    <p className="mt-1 flex items-center gap-2 text-[12px] text-secondary">
                      <Avatar id={owner.id} name={owner.name} src={owner.avatarUrl} size="xs" /> Reward for {owner.name}
                    </p>
                  )}
                  {!owner && c.description && <p className="text-[12px] text-secondary">{c.description}</p>}
                </td>
                <td className={td}>{c.type === "percent" ? `${c.value}%${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ""}` : formatINR(c.value)}</td>
                <td className={`${td} tabular-nums`}>{c.minOrder ? formatINR(c.minOrder) : "—"}</td>
                <td className={`${td} tabular-nums`}>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className={td}>{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                <td className={td}>
                  <span className={`badge ${expired ? "bg-error/10 text-error" : c.active ? "bg-success/10 text-success" : "bg-ivory/5 text-secondary"}`}>{expired ? "Expired" : c.active ? "Active" : "Paused"}</span>
                </td>
                <td className={`${td} text-right`}><CouponActions id={c.id} active={c.active} /></td>
              </tr>
            );
          })}
        </Table>
      </div>
    </>
  );
}
