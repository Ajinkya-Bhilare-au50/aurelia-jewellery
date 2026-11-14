import Image from "@/components/Img";
import Link from "next/link";
import { DiamondIcon, GiftIcon, ReturnIcon, ShieldIcon, StarIcon } from "@/components/Icons";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { listShopProducts } from "@/lib/db";
import { CATEGORY_LABEL, img } from "@/lib/format";
import { LIFESTYLE } from "@/lib/lifestyle";
import type { Category } from "@/lib/types";

const HERO = img("1573408301185-9146fe634ad0");

const PROMISES = [
  { Icon: ShieldIcon, title: "BIS Hallmarked", text: "Every piece certified for purity, with IGI-graded diamonds." },
  { Icon: DiamondIcon, title: "Lifetime exchange", text: "Full value on gold and diamonds whenever you upgrade." },
  { Icon: ReturnIcon, title: "30-day returns", text: "Free returns within 30 days of delivery." },
  { Icon: GiftIcon, title: "Gift ready", text: "Signature keepsake box and handwritten note." },
];

// Sample testimonials for the demo store. Replace with verified reviews from your review provider.
const REVIEWS = [
  { name: "Ananya R.", city: "Mumbai", piece: "Celeste Halo Solitaire Ring", text: "The diamond is even more brilliant in person. The certificate, the box, the handwritten note: everything felt considered." },
  { name: "Karthik S.", city: "Chennai", piece: "Rani Temple Necklace Set", text: "Bought for my sister's wedding. The craftsmanship on the temple work is exceptional, and delivery was fully insured and on time." },
  { name: "Meher P.", city: "Delhi", piece: "Soleil Twisted Hoops", text: "Light enough to wear all day, and the polish is beautiful. I have already been asked about them three times." },
];

export default async function Home() {
  const db = { products: await listShopProducts() };
  const newest = [...db.products].filter((p) => p.stock > 0).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const best = db.products.filter((p) => p.featured && !newest.some((n) => n.id === p.id)).slice(0, 4);
  const cats = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({
    key: c,
    label: CATEGORY_LABEL[c],
    image: (db.products.find((p) => p.category === c && p.featured) ?? db.products.find((p) => p.category === c))?.images[0],
    count: db.products.filter((p) => p.category === c).length,
  }));
  const bridal = db.products.find((p) => p.slug === "rani-temple-necklace-set");

  return (
    <>
      {/* 3. Cinematic hero */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[64%]">
          <Image src={HERO} alt="Diamond tennis bracelet in platinum on a black background" fill priority sizes="(min-width:1024px) 64vw, 100vw" className="object-cover object-center animate-reveal" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent lg:bg-gradient-to-r lg:from-background lg:via-background/20" />
        </div>
        <div className="container-page relative pb-14 pt-2 lg:flex lg:min-h-[680px] lg:items-center lg:py-24 xl:min-h-[760px]">
          <div className="max-w-[560px]">
            <p className="label !text-gold animate-fade">The Heirloom Edit · 2026</p>
            <h1 className="h-hero mt-5 animate-fade [animation-delay:80ms]">The Art of Timeless <em className="italic text-gold">Elegance</em></h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-secondary animate-fade [animation-delay:160ms] md:text-base">Discover exceptional pieces designed to make every moment unforgettable.</p>
            <div className="mt-10 flex flex-col gap-3 animate-fade [animation-delay:240ms] min-[430px]:flex-row">
              <Link href="/shop" className="btn-primary">Explore the Collection</Link>
              <Link href="#bestsellers" className="btn-secondary">Discover Best Sellers</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Shop by category */}
      <section className="container-page py-16 md:py-24">
        <SectionHeading eyebrow="Shop by category" title="Find your signature" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {cats.map((c) => (
            <Link key={c.key} href={`/shop?category=${c.key}`} data-theme="dark" className="group relative block aspect-[3/4] overflow-hidden bg-surface">
              {c.image && <Image src={c.image} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                <p className="font-display text-[24px] leading-none text-ivory md:text-[30px]">{c.label}</p>
                <p className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-secondary">
                  {c.count} pieces <span className="text-gold transition-transform duration-300 group-hover:translate-x-1">→</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. New arrivals */}
      <section className="container-page pb-16 md:pb-24">
        <SectionHeading align="split" eyebrow="Just in" title="New arrivals" href="/shop?sort=newest" linkLabel="View all new" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {newest.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* 6. Best sellers */}
      <section id="bestsellers" className="scroll-mt-24 border-y border-border bg-surface py-16 md:py-24">
        <div className="container-page">
          <SectionHeading align="split" eyebrow="Most loved" title="Best sellers" href="/shop" linkLabel="Shop all" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {best.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* 7. Featured collection */}
      {bridal && (
        <section className="container-page py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-20">
            <Link href={`/product/${bridal.slug}`} className="group relative aspect-[4/5] overflow-hidden bg-surface">
              <Image src={bridal.images[0]} alt={bridal.name} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-[1.03]" />
            </Link>
            <div className="max-w-md">
              <p className="label !text-gold">Featured collection</p>
              <h2 className="h-section mt-4 !text-[34px] md:!text-[44px] xl:!text-[52px]">The Bridal Atelier</h2>
              <p className="mt-6 text-secondary">Temple gold, reimagined for the modern bride. Each Rani set takes 180 hours of hand-chasing in 22K hallmarked gold, set with ruby-red stones and finished with matching jhumkas.</p>
              <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-border py-6">
                {[["22K", "Hallmarked gold"], ["180h", "Hand-chased"], ["46g", "Gold weight"]].map(([v, l]) => (
                  <div key={l} className="flex flex-col-reverse"><dt className="mt-1 text-[12px] text-muted">{l}</dt><dd className="font-display text-[28px] text-gold">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href={`/product/${bridal.slug}`} className="btn-primary">Discover the Rani set</Link>
                <Link href="/shop?category=necklaces" className="btn-secondary">All necklaces</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 8. Craftsmanship story */}
      <section id="craft" className="scroll-mt-24 bg-surface-muted py-16 md:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="self-center lg:col-span-5">
            <p className="label !text-gold">Our craft</p>
            <h2 className="h-section mt-4">Made by hand, in workshops we know by name.</h2>
            <p className="mt-6 text-secondary">For over 25 years our artisans in Jaipur and Coimbatore have set every stone and polished every link by hand. Each piece is hallmarked, independently graded and inspected three times before it leaves the atelier.</p>
            <Link href="/shop" className="btn-tertiary mt-8">Explore the collection</Link>
          </div>
          <div className="relative aspect-[16/11] overflow-hidden bg-surface lg:col-span-7">
            <Image src={LIFESTYLE.hands} alt="Hands wearing stacked gold rings and a fine bracelet" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
          </div>
          <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:col-span-12 lg:grid-cols-4">
            {PROMISES.map(({ Icon, title, text }) => (
              <li key={title} className="bg-surface-muted p-6 md:p-8">
                <Icon width={26} height={26} className="text-gold" />
                <p className="mt-5 text-[15px] font-medium text-ivory">{title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-secondary">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. Editorial campaign banner */}
      <section data-theme="dark" className="relative isolate flex min-h-[520px] items-end overflow-hidden md:min-h-[640px] md:items-center">
        <Image src={LIFESTYLE.layered} alt="Model wearing layered gold necklaces" fill sizes="100vw" className="-z-10 object-cover object-[center_30%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/30" />
        <div className="container-page py-12">
          <div className="max-w-md">
            <p className="label !text-gold">The Layering Edit</p>
            <h2 className="h-section mt-4 !text-[34px] md:!text-[48px]">Wear your story, one fine chain at a time.</h2>
            <p className="mt-5 text-secondary">Delicate pendants and fine chains in 14K and 18K gold, designed to be layered and lived in.</p>
            <Link href="/shop?category=necklaces" className="btn-primary mt-8">Shop the edit</Link>
          </div>
        </div>
      </section>

      {/* 10. Customer reviews */}
      <section className="container-page py-16 md:py-24">
        <SectionHeading eyebrow="Client stories" title="Loved across India" />
        <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
          {REVIEWS.map((r) => (
            <li key={r.name} className="card flex flex-col p-6 md:p-8">
              <div className="flex gap-1 text-gold" role="img" aria-label="Rated 5 out of 5">{[0, 1, 2, 3, 4].map((i) => <StarIcon key={i} width={14} height={14} />)}</div>
              <blockquote className="mt-5 flex-1 font-display text-[21px] leading-snug text-ivory">“{r.text}”</blockquote>
              <p className="mt-6 text-[13px] text-ivory">{r.name} <span className="text-muted">· {r.city}</span></p>
              <p className="mt-1 text-[12px] text-muted">Purchased: {r.piece}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 11. Newsletter */}
      <section className="border-t border-border pt-16 md:pt-20">
        <div className="container-page text-center">
          <p className="label !text-gold">The Aurelia letter</p>
          <h2 className="h-section mt-4">First access to new collections</h2>
          <p className="mx-auto mt-4 max-w-md text-secondary">Private previews, styling notes and invitations. Never more than twice a month.</p>
          <div className="mt-8"><NewsletterForm /></div>
          <p className="mt-6 text-[13px] text-muted">Have a friend who&apos;d love Aurelia? <Link href="/account" className="link text-secondary">Give 10%, get ₹500</Link></p>
        </div>
      </section>
    </>
  );
}
