import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { DiamondIcon, ReturnIcon, SaleIcon, ShieldIcon } from "@/components/Icons";
import { PincodeChecker } from "@/components/PincodeChecker";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { SectionHeading } from "@/components/SectionHeading";
import { prisma, toProduct, withSales } from "@/lib/db";
import { CATEGORY_LABEL, formatDate, formatINR } from "@/lib/format";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const p = await prisma.product.findUnique({ where: { slug: params.slug }, select: { name: true, description: true } });
  return { title: p?.name ?? "Product", description: p?.description };
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const row = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!row) notFound();
  const [p, ...related] = await withSales([
    toProduct(row),
    ...(await prisma.product.findMany({ where: { category: row.category, id: { not: row.id } }, orderBy: { createdAt: "asc" }, take: 4 })).map(toProduct),
  ]);
  const off = p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  const hasDiamonds = /diamond/i.test(p.description);

  const specs: [string, string][] = [["Metal", p.metal], ["Purity", p.purity], ["Weight", p.weight], ["Certification", hasDiamonds ? "BIS Hallmark · IGI" : "BIS Hallmark"]];
  const sections = [
    { title: "Description", body: p.description },
    { title: "Certification & care", body: `${hasDiamonds ? "Diamonds are graded by IGI and the certificate ships with your piece. " : ""}Metal purity is BIS hallmarked. Store each piece separately in its pouch, avoid perfume and chlorine, and clean gently with a soft cloth.` },
    { title: "Shipping, returns & warranty", body: "Free fully-insured shipping above ₹2,999, dispatched within 24 hours in tamper-proof packaging. Free returns within 30 days of delivery. One-year manufacturing warranty and lifetime exchange on gold and diamonds." },
  ];

  return (
    <>
      <div className="container-page pt-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="text-[12px] text-muted">
          <Link href="/" className="hover:text-ivory">Home</Link><span className="mx-2">/</span>
          <Link href={`/shop?category=${p.category}`} className="hover:text-ivory">{CATEGORY_LABEL[p.category]}</Link><span className="mx-2">/</span>
          <span className="text-secondary">{p.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14 xl:gap-20">
          <div className="lg:col-span-7"><ProductGallery images={p.images} name={p.name} /></div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="label">{CATEGORY_LABEL[p.category]} · {p.metal}</p>
              <h1 className="h-display mt-3 text-[34px] md:text-[44px]">{p.name}</h1>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-[24px] font-medium text-gold tabular-nums">{formatINR(p.price)}</p>
                {p.compareAtPrice && <p className="text-muted line-through tabular-nums">{formatINR(p.compareAtPrice)}</p>}
                {off > 0 && <span className="badge bg-success/15 text-success">Save {off}%</span>}
              </div>
              {p.sale && (
                <p className="mt-2 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-gold">
                  <SaleIcon size={14} /> {p.sale.name} price · ends {formatDate(p.sale.endsAt)}
                </p>
              )}
              <p className="mt-1 text-[12px] text-muted">Inclusive of all taxes · No-cost EMI from {formatINR(Math.ceil(p.price / 12))}/month</p>

              <dl className="mt-8 grid grid-cols-2 border-t border-border">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex flex-col-reverse border-b border-border py-3 odd:pr-4 even:border-l even:pl-4">
                    <dd className="mt-1 text-sm text-ivory">{v}</dd>
                    <dt className="text-[10px] font-medium uppercase tracking-label text-muted">{k}</dt>
                  </div>
                ))}
              </dl>

              <div className="mt-8"><AddToCart product={p} /></div>
              <div className="mt-8"><PincodeChecker /></div>

              <ul className="mt-8 grid grid-cols-3 gap-2 border-y border-border py-5 text-center text-[11px] uppercase tracking-[0.1em] text-secondary">
                <li className="flex flex-col items-center gap-2"><ShieldIcon className="text-gold" />Hallmarked</li>
                <li className="flex flex-col items-center gap-2"><ReturnIcon className="text-gold" />30-day returns</li>
                <li className="flex flex-col items-center gap-2"><DiamondIcon className="text-gold" />Lifetime exchange</li>
              </ul>

              <div className="divide-y divide-border">
                {sections.map((s, i) => (
                  <details key={s.title} open={i === 0} className="group py-4">
                    <summary className="flex min-h-[32px] cursor-pointer list-none items-center justify-between text-[12px] font-semibold uppercase tracking-[0.14em] text-ivory [&::-webkit-details-marker]:hidden">
                      {s.title}<span aria-hidden className="text-lg font-light text-gold transition-transform duration-300 group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-secondary">{s.body}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-page mt-20 md:mt-28">
          <SectionHeading align="split" eyebrow="You may also love" title={`More ${CATEGORY_LABEL[p.category].toLowerCase()}`} href={`/shop?category=${p.category}`} />
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
