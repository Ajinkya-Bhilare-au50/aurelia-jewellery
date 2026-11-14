import Image from "@/components/Img";
import Link from "next/link";
import { AdminHeader, Table, td } from "@/components/admin/AdminTable";
import { listProducts } from "@/lib/db";
import { CATEGORY_LABEL, formatINR } from "@/lib/format";

export const metadata = { title: "Products" };

export default async function AdminProducts() {
  const products = await listProducts();
  return (
    <>
      <AdminHeader title="Products" subtitle={`${products.length} products`} action={<Link href="/admin/products/new" className="btn-primary btn-sm">Add product</Link>} />
      <Table head={["", "Product", "Category", "Metal", "Price", "Stock", ""]}>
        {products.map((p) => (
          <tr key={p.id} className="hover:bg-surface-elevated/60">
            <td className={`${td} w-16`}>
              <div className="relative h-14 w-12 overflow-hidden bg-surface"><Image src={p.images[0]} alt="" fill sizes="48px" className="object-cover" /></div>
            </td>
            <td className={td}>
              <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-gold">{p.name}</Link>
              {p.featured && <span className="badge ml-2 bg-gold/10 text-gold">Featured</span>}
            </td>
            <td className={td}>{CATEGORY_LABEL[p.category]}</td>
            <td className={td}>{p.metal} · {p.purity}</td>
            <td className={`${td} tabular-nums`}>{formatINR(p.price)}</td>
            <td className={td}><span className={p.stock === 0 ? "text-error" : p.stock <= 3 ? "text-gold" : ""}>{p.stock}</span></td>
            <td className={`${td} text-right`}><Link href={`/admin/products/${p.id}`} className="text-[12px] uppercase tracking-[0.12em] link">Edit</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
