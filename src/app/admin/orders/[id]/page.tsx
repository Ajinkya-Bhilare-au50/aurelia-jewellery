import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusUpdater } from "@/components/admin/StatusUpdater";
import { CancelOrder } from "@/components/CancelOrder";
import { OrderDetail } from "@/components/OrderDetail";
import { ORDER_CANCELLABLE } from "@/lib/cancellation";
import { prisma, toOrder } from "@/lib/db";
import { allowedNext } from "@/lib/orders";

export const metadata = { title: "Order" };

export default async function AdminOrder(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const row = await prisma.order.findUnique({ where: { id: params.id } });
  if (!row) notFound();
  const order = toOrder(row);
  return (
    <>
      <Link href="/admin/orders" className="text-[12px] uppercase tracking-[0.14em] text-secondary hover:text-ivory">← Orders</Link>
      <h1 className="h-display mb-8 mt-3 text-[40px]">Order {order.number}</h1>
      <OrderDetail
        admin
        order={order}
        aside={
          <>
            <StatusUpdater key={order.status} orderId={order.id} options={allowedNext(order.status).filter((s) => s !== "cancelled")} />
            {ORDER_CANCELLABLE.includes(order.status) && <CancelOrder order={order} admin />}
          </>
        }
      />
    </>
  );
}
