import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckIcon, DownloadIcon } from "@/components/Icons";
import { invoiceAvailable } from "@/lib/invoice";
import { CancelOrder } from "@/components/CancelOrder";
import { OrderDetail } from "@/components/OrderDetail";
import { ORDER_CANCELLABLE } from "@/lib/cancellation";
import { getUser } from "@/lib/auth";
import { prisma, toOrder } from "@/lib/db";

export const metadata = { title: "Order details" };

export default async function OrderPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await getUser();
  if (!user) redirect("/login");
  const row = await prisma.order.findFirst({ where: { id: params.id, ...(user.role === "admin" ? {} : { userId: user.id }) } });
  if (!row) notFound();
  const order = toOrder(row);

  return (
    <div className="container-page py-12 lg:py-16">
      {searchParams.placed && order.status !== "pending_payment" && (
        <div className="mb-12 flex flex-col items-center border-b border-border pb-12 text-center animate-fade">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold text-background"><CheckIcon width={26} height={26} strokeWidth={2} /></span>
          <h1 className="h-display mt-6 text-[40px] lg:text-[52px]">Thank you for your order</h1>
          <p className="mt-3 max-w-md text-secondary">We&apos;ve received your payment and our artisans are preparing your piece. A confirmation has been sent to {order.email}.</p>
        </div>
      )}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/account" className="text-[12px] uppercase tracking-[0.14em] text-secondary hover:text-ivory">← My account</Link>
          <h2 className="h-display mt-3 text-[36px]">Order {order.number}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {invoiceAvailable(order) && (
            <a href={`/api/orders/${order.id}/invoice`} download className="btn-secondary btn-sm inline-flex items-center gap-2"><DownloadIcon size={16} /> Download invoice</a>
          )}
          <Link href="/shop" className="btn-secondary btn-sm">Continue shopping</Link>
        </div>
      </div>
      <OrderDetail order={order} aside={ORDER_CANCELLABLE.includes(order.status) && order.userId === user.id ? <CancelOrder order={order} /> : undefined} />
    </div>
  );
}
