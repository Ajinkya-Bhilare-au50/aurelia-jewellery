import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
      <p className="label !text-gold">404</p>
      <h1 className="h-display mt-4 h-page">This page has gone missing</h1>
      <p className="mt-3 text-secondary">Like a lost earring. Let&apos;s get you back to something beautiful.</p>
      <Link href="/shop" className="btn-primary mt-10">Shop the collection</Link>
    </div>
  );
}
