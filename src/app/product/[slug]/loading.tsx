export default function Loading() {
  return (
    <div className="container-page pt-6 lg:pt-10" aria-busy="true" aria-label="Loading product">
      <div className="skeleton h-3 w-48" />
      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="skeleton aspect-[4/5] lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-12 w-4/5" />
          <div className="skeleton h-7 w-40" />
          <div className="skeleton mt-8 h-32 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
