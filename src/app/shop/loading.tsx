export default function Loading() {
  return (
    <div className="container-page pt-10 lg:pt-14" aria-busy="true" aria-label="Loading products">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-6 h-12 w-72" />
      <div className="skeleton mt-8 h-24 w-full" />
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5]" />
            <div className="skeleton mt-4 h-3 w-20" />
            <div className="skeleton mt-2 h-4 w-40" />
            <div className="skeleton mt-2 h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
