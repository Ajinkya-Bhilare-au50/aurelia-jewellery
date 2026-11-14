"use client";

import Image from "@/components/Img";
import { useRef, useState } from "react";
import { ImageLightbox } from "./ImageLightbox";
import { ZoomInIcon } from "./Icons";

/**
 * Thumbnails + main image (§9).
 * Mouse: hover magnifies under the cursor. Touch: swipe to change photo.
 * Click / tap: full-screen viewer with pinch-zoom (ImageLightbox).
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [hoverZoom, setHoverZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [open, setOpen] = useState(false);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const many = images.length > 1;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  function onDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }
  function onUp(e: React.PointerEvent) {
    const s = swipe.current;
    swipe.current = null;
    if (!s || !many) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      setActive((i) => (i + (dx < 0 ? 1 : -1) + images.length) % images.length);
      swipe.current = { x: NaN, y: NaN, t: 0 }; // mark: this gesture was a swipe, not a tap
    }
  }
  function onClick() {
    if (swipe.current && Number.isNaN(swipe.current.x)) {
      swipe.current = null;
      return;
    }
    setHoverZoom(false);
    setOpen(true);
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {many && (
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
        className="relative aspect-[4/5] flex-1 cursor-zoom-in touch-pan-y overflow-hidden bg-surface"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHoverZoom(true)}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverZoom(false)}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Open full-screen view of ${name}`}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(true))}
      >
        <Image
          key={images[active]}
          src={images[active]}
          alt={name}
          fill
          priority
          sizes="(min-width:1024px) 55vw, 100vw"
          style={{ transformOrigin: origin }}
          className={`object-cover transition-transform duration-300 ease-out animate-fade ${hoverZoom ? "scale-[2]" : "scale-100"}`}
        />
        <span className={`pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-1.5 bg-background/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-secondary backdrop-blur transition-opacity ${hoverZoom ? "opacity-0" : "opacity-100"}`}>
          <ZoomInIcon size={13} /> <span className="md:hidden">Tap to zoom</span><span className="hidden md:inline">Click to enlarge</span>
        </span>
        {many && (
          <span className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" aria-hidden>
            {images.map((src, i) => <span key={src} className={`h-1.5 w-1.5 rounded-full ${i === active ? "bg-gold" : "bg-ivory/40"}`} />)}
          </span>
        )}
      </div>
      {open && <ImageLightbox images={images} name={name} start={active} onClose={(i) => { setActive(i); setOpen(false); }} />}
    </div>
  );
}
