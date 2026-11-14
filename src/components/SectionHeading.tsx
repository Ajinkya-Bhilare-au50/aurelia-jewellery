import Link from "next/link";

export function SectionHeading({ eyebrow, title, href, linkLabel = "View all", align = "center" }: { eyebrow: string; title: string; href?: string; linkLabel?: string; align?: "center" | "split" }) {
  if (align === "split")
    return (
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12">
        <div>
          <p className="label !text-gold">{eyebrow}</p>
          <h2 className="h-section mt-3">{title}</h2>
        </div>
        {href && <Link href={href} className="btn-tertiary">{linkLabel}</Link>}
      </div>
    );
  return (
    <div className="mb-10 flex flex-col items-center gap-3 text-center md:mb-14">
      <p className="label !text-gold">{eyebrow}</p>
      <h2 className="h-section">{title}</h2>
      {href && <Link href={href} className="btn-tertiary mt-2">{linkLabel}</Link>}
    </div>
  );
}
