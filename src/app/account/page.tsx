import Image from "@/components/Img";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AvatarEditor } from "@/components/AvatarEditor";
import { CopyButton } from "@/components/CopyButton";
import { CouponIcon, GiftIcon, PackageIcon } from "@/components/Icons";
import { LogoutButton } from "@/components/LogoutButton";
import { VerifyPhoneCard } from "@/components/VerifyPhoneCard";
import { StatusBadge } from "@/components/OrderTimeline";
import { getUser } from "@/lib/auth";
import { prisma, toCoupon, toOrder } from "@/lib/db";
import { formatDate, formatINR } from "@/lib/format";
import { couponProblem, referralEligible } from "@/lib/pricing";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const [orderRows, rewardRows, referred, referralActive] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.coupon.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.user.count({ where: { referredById: user.id } }),
    referralEligible(user),
  ]);
  const orders = orderRows.map(toOrder);
  const rewards = rewardRows.map(toCoupon);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shareLink = `${site}/register?ref=${user.referralCode}`;

  return (
    <div className="container-page py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div className="flex flex-wrap items-end gap-6">
          <AvatarEditor id={user.id} name={user.name} avatarUrl={user.avatarUrl} />
          <div>
            <p className="label !text-gold">My account</p>
            <h1 className="h-display mt-3 h-page">Hello, {user.name.split(" ")[0]}</h1>
            <p className="mt-2 text-sm text-secondary">{user.email}{user.phone && ` · ${user.phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2")}`} · Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {user.role === "admin" && <Link href="/admin" className="btn-primary btn-sm">Admin dashboard</Link>}
          <LogoutButton withIcon />
        </div>
      </div>

      {referralActive && (
        <p className="mt-8 flex items-center gap-3 border border-gold/40 bg-gold/5 px-5 py-4 text-sm">
          <GiftIcon className="shrink-0 text-gold" /> <span>Your referral</span> welcome gift is active: <strong className="font-medium">10% off your first order</strong> (up to ₹1,000), applied automatically at checkout.
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <h2 className="flex items-center gap-3 font-display text-3xl"><PackageIcon size={24} className="text-gold" /> Orders</h2>
          {orders.length === 0 ? (
            <div className="mt-6 border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl">No orders yet</p>
              <Link href="/shop" className="btn-primary mt-6">Start shopping</Link>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.id}`} className="group flex flex-wrap items-center gap-5 py-5">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((i) => (
                        <div key={i.productId + i.size} className="relative h-16 w-14 overflow-hidden border-2 border-background bg-surface">
                          <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <p className="font-medium group-hover:text-gold">{o.number}</p>
                      <p className="text-[13px] text-secondary">{formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} items</p>
                    </div>
                    <StatusBadge status={o.status} />
                    <p className="w-28 text-right tabular-nums">{formatINR(o.total)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-8 lg:col-span-4">
          {!user.phone && <VerifyPhoneCard />}
          <section className="border border-gold/30 bg-surface-muted p-8">
            <p className="label !text-gold">Refer a friend</p>
            <p className="h-display mt-3 text-3xl">Give 10%. Get ₹500.</p>
            <p className="mt-3 text-sm text-ivory/70">Friends get 10% off their first order. You get a ₹500 coupon once their order is confirmed.</p>
            <div className="mt-6 flex items-center justify-between border border-dashed border-gold/50 px-4 py-3">
              <span className="font-display text-2xl tracking-[0.18em]">{user.referralCode}</span>
              <CopyButton text={shareLink} label="Copy link" />
            </div>
            <p className="mt-3 text-[12px] text-ivory/50">{referred} {referred === 1 ? "friend has" : "friends have"} joined with your code</p>
          </section>

          <section className="card p-8">
            <h2 className="flex items-center gap-3 font-display text-2xl"><CouponIcon size={22} className="text-gold" /> My rewards</h2>
            {rewards.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">Referral rewards will appear here.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {rewards.map((c) => {
                  const problem = c.usedCount >= (c.usageLimit ?? Infinity) ? "Used" : couponProblem(c, Infinity, user) ? "Expired" : null;
                  return (
                    <li key={c.id} className={`border border-dashed p-4 ${problem ? "border-border opacity-60" : "border-gold"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-semibold">{c.code}</span>
                        {problem ? <span className="badge bg-ivory/5 text-secondary">{problem}</span> : <CopyButton text={c.code} />}
                      </div>
                      <p className="mt-2 text-[13px] text-secondary">{formatINR(c.value)} off orders above {formatINR(c.minOrder)}{c.expiresAt && ` · until ${formatDate(c.expiresAt)}`}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
