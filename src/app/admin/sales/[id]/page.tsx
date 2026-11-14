import Link from "next/link";
import { notFound } from "next/navigation";
import { SaleForm } from "@/components/admin/SaleForm";
import { listProducts, prisma, toSale } from "@/lib/db";

export const metadata = { title: "Sale" };

export default async function EditSale(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const isNew = params.id === "new";
  const [row, products] = await Promise.all([isNew ? null : prisma.sale.findUnique({ where: { id: params.id } }), listProducts()]);
  if (!isNew && !row) notFound();
  return (
    <>
      <Link href="/admin/sales" className="text-[12px] uppercase tracking-[0.14em] text-secondary hover:text-ivory">← Sales</Link>
      <h1 className="h-display mb-8 mt-3 break-words text-[32px] sm:text-[40px]">{isNew ? "New sale" : `Edit ${row!.name}`}</h1>
      <SaleForm sale={row ? toSale(row) : undefined} products={products.map(({ id, name, category, price }) => ({ id, name, category, price }))} />
    </>
  );
}
