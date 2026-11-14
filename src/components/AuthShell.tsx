import Image from "@/components/Img";
import { LIFESTYLE } from "@/lib/lifestyle";

export function AuthShell({ eyebrow, title, children, footer }: { eyebrow: string; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-page grid gap-12 py-12 lg:grid-cols-2 lg:gap-20 lg:py-16">
      <div className="relative hidden overflow-hidden bg-surface lg:block">
        <Image src={LIFESTYLE.hero} alt="Gold pendant necklace on a model" fill sizes="50vw" className="object-cover" />
      </div>
      <div className="mx-auto w-full max-w-[420px] py-4 lg:py-16">
        <p className="label !text-gold">{eyebrow}</p>
        <h1 className="h-display mt-4 text-[40px] lg:text-[48px]">{title}</h1>
        <div className="mt-10">{children}</div>
        {footer}
      </div>
    </div>
  );
}
