import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { prisma, toProduct } from "@/lib/db";

export const metadata = { title: "Edit product" };

export default async function EditProduct(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const isNew = params.id === "new";
  const row = isNew ? null : await prisma.product.findUnique({ where: { id: params.id } });
  const product = row ? toProduct(row) : undefined;
  if (!isNew && !product) notFound();
  return (
    <>
      <Link href="/admin/products" className="text-[12px] uppercase tracking-[0.14em] text-secondary hover:text-ivory">← Products</Link>
      <h1 className="h-display mb-8 mt-3 text-[40px]">{product ? product.name : "New product"}</h1>
      <ProductForm product={product} />
    </>
  );
}
