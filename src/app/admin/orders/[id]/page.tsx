import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusUpdater } from "@/components/admin/StatusUpdater";
import { CancelOrder } from "@/components/CancelOrder";
import { OrderDetail } from "@/components/OrderDetail";
import { ORDER_CANCELLABLE } from "@/lib/cancellation";
import { prisma, toOrder } from "@/lib/db";
import { allowedNext } from "@/lib/orders";
import { getUser } from "@/lib/auth";
import { maskOrder } from "@/lib/privacy";
import { isDemoAdmin } from "@/lib/roles";
import { DownloadIcon } from "@/components/Icons";
import { invoiceAvailable } from "@/lib/invoice";

export const metadata = { title: "Order" };

export default async function AdminOrder(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const row = await prisma.order.findUnique({ where: { id: params.id } });
  if (!row) notFound();
  const readOnly = isDemoAdmin((await getUser())?.role);
  const order = readOnly ? maskOrder(toOrder(row)) : toOrder(row);
  return (
    <>
      <Link href="/admin/orders" className="text-[12px] uppercase tracking-[0.14em] text-secondary hover:text-ivory">← Orders</Link>
      <div className="mb-8 mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-display break-words text-[32px] sm:text-[40px]">Order {order.number}</h1>
        {invoiceAvailable(order) && (
          <a href={`/api/orders/${order.id}/invoice`} download className="btn-secondary btn-sm inline-flex items-center gap-2"><DownloadIcon size={16} /> Invoice (PDF)</a>
        )}
      </div>
      <OrderDetail
        admin
        order={order}
        aside={
          <>
            {!readOnly && <StatusUpdater key={order.status} orderId={order.id} options={allowedNext(order.status).filter((s) => s !== "cancelled")} />}
            {!readOnly && ORDER_CANCELLABLE.includes(order.status) && <CancelOrder order={order} admin />}
          </>
        }
      />
    </>
  );
}
