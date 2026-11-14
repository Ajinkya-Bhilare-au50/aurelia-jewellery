"use client";

import Image from "@/components/Img";
import { useState } from "react";

/** Thumbnails + main image with hover/tap zoom (§9). */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {images.length > 1 && (
        <div className="flex gap-3 md:flex-col" role="tablist" aria-label="Product images">
          {images.map((src, i) => (
            <button key={src} role="tab" aria-selected={i === active} onClick={() => setActive(i)} aria-label={`Show image ${i + 1} of ${images.length}`}
              className={`relative h-24 w-20 overflow-hidden bg-surface ring-1 ring-offset-2 ring-offset-background transition ${i === active ? "ring-gold" : "ring-transparent opacity-60 hover:opacity-100"}`}>
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <div
        className={`relative aspect-[4/5] flex-1 overflow-hidden bg-surface ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onPointerMove={move}
        onPointerLeave={() => setZoom(false)}
        onClick={() => setZoom((z) => !z)}
        role="button"
        tabIndex={0}
        aria-label={zoom ? "Zoom out" : "Zoom in on image"}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setZoom((z) => !z))}
      >
        <Image
          key={images[active]}
          src={images[active]}
          alt={name}
          fill
          priority
          sizes="(min-width:1024px) 55vw, 100vw"
          style={{ transformOrigin: origin }}
          className={`object-cover transition-transform duration-300 ease-out animate-fade ${zoom ? "scale-[2.2]" : "scale-100"}`}
        />
        <span className={`pointer-events-none absolute bottom-4 right-4 bg-background/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-secondary backdrop-blur transition-opacity ${zoom ? "opacity-0" : "opacity-100"}`}>Tap to zoom</span>
      </div>
    </div>
  );
}
