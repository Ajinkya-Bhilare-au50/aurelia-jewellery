"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./Icons";
import Img from "./Img";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
type Pt = { x: number; y: number };

/**
 * Full-screen photo viewer: pinch / double-tap / wheel to zoom, drag to pan,
 * swipe to change photo, swipe down / Esc / ✕ to close. No library.
 */
export function ImageLightbox({ images, name, start, onClose }: { images: string[]; name: string; start: number; onClose: (index: number) => void }) {
  const [index, setIndex] = useState(start);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [animate, setAnimate] = useState(true);
  const [dragY, setDragY] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ start: Pt; startView: typeof view; dist?: number; mid?: Pt; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  const many = images.length > 1;
  const go = useCallback(
    (d: number) => {
      if (!many) return;
      setAnimate(false);
      setView({ s: 1, x: 0, y: 0 });
      setIndex((i) => (i + d + images.length) % images.length);
    },
    [many, images.length],
  );
  const close = useCallback(() => onClose(index), [onClose, index]);

  // Keyboard, scroll lock, focus
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, go]);

  /** Keep the zoomed photo covering the screen (no panning into empty space). */
  const clamp = useCallback((v: { s: number; x: number; y: number }) => {
    const r = stage.current?.getBoundingClientRect();
    if (!r || v.s <= 1) return { s: Math.max(1, v.s), x: 0, y: 0 };
    const mx = ((v.s - 1) * r.width) / 2;
    const my = ((v.s - 1) * r.height) / 2;
    return { s: Math.min(MAX_SCALE, v.s), x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) };
  }, []);

  /** Zoom to scale `s` keeping screen point `p` (relative to the stage centre) still. */
  const zoomAt = useCallback(
    (from: typeof view, s: number, p: Pt) => {
      const k = s / from.s;
      return clamp({ s, x: p.x - (p.x - from.x) * k, y: p.y - (p.y - from.y) * k });
    },
    [clamp],
  );

  const rel = (e: { clientX: number; clientY: number }): Pt => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, rel(e));
    setAnimate(false);
    const pts = [...pointers.current.values()];
    if (pts.length === 1) gesture.current = { start: pts[0], startView: viewRef.current, moved: false };
    if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = { start: a, startView: viewRef.current, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, moved: true };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, rel(e));
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length >= 2 && g.dist) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.max(1, Math.min(MAX_SCALE, (g.startView.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist));
      const z = zoomAt(g.startView, s, g.mid!);
      setView(clamp({ s: z.s, x: z.x + mid.x - g.mid!.x, y: z.y + mid.y - g.mid!.y }));
      return;
    }
    const dx = pts[0].x - g.start.x;
    const dy = pts[0].y - g.start.y;
    if (Math.hypot(dx, dy) > 8) g.moved = true;
    if (g.startView.s > 1) setView(clamp({ ...g.startView, x: g.startView.x + dx, y: g.startView.y + dy }));
    else if (Math.abs(dy) > Math.abs(dx)) setDragY(Math.max(0, dy)); // swipe down to close
    else setView({ s: 1, x: dx, y: 0 }); // swipe sideways to change photo
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // one finger left after a pinch: continue as a pan from here
      const rest = [...pointers.current.values()][0];
      gesture.current = { start: rest, startView: viewRef.current, moved: true };
      return;
    }
    gesture.current = null;
    setAnimate(true);
    if (!g || !p) return;
    const dx = p.x - g.start.x;
    if (!g.moved) {
      // tap: double-tap toggles zoom at that point
      const now = Date.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        setView(viewRef.current.s > 1 ? { s: 1, x: 0, y: 0 } : zoomAt(viewRef.current, DOUBLE_TAP_SCALE, p));
      } else lastTap.current = now;
      return;
    }
    if (g.startView.s <= 1) {
      if (dragY > 120) return close();
      setDragY(0);
      if (Math.abs(dx) > 60) return go(dx < 0 ? 1 : -1);
      setView({ s: 1, x: 0, y: 0 });
    }
  }

  function onWheel(e: React.WheelEvent) {
    setAnimate(false);
    const s = Math.max(1, Math.min(MAX_SCALE, viewRef.current.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    setView(zoomAt(viewRef.current, s, rel(e)));
  }

  const btn = "flex h-11 w-11 items-center justify-center bg-surface/80 text-ivory backdrop-blur transition-colors hover:text-gold";
  return createPortal(
    <div data-theme="dark" role="dialog" aria-modal="true" aria-label={`${name}: photo ${index + 1} of ${images.length}`} className="fixed inset-0 z-[100] flex flex-col bg-background" style={{ opacity: 1 - Math.min(dragY / 400, 0.6) }}>
      <div className="flex items-center justify-between px-4 py-3 text-ivory">
        <span className="text-[12px] tabular-nums tracking-[0.14em] text-secondary">{many ? `${index + 1} / ${images.length}` : ""}</span>
        <button ref={closeBtn} type="button" onClick={close} aria-label="Close" className={btn}><CloseIcon size={22} /></button>
      </div>

      <div
        ref={stage}
        className="relative flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: view.s > 1 ? "grab" : "zoom-in" }}
      >
        <div
          className={`absolute inset-0 ${animate ? "transition-transform duration-200 ease-out" : ""}`}
          style={{ transform: `translate3d(${view.x}px, ${view.y + dragY}px, 0) scale(${view.s})` }}
        >
          <Img key={images[index]} src={images[index]} alt={`${name}, photo ${index + 1}`} fill sizes="100vw" quality={85} priority className="pointer-events-none object-contain" draggable={false} />
        </div>
        {many && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} onPointerDown={(e) => e.stopPropagation()} className={`${btn} absolute left-3 top-1/2 hidden -translate-y-1/2 md:flex`}><ChevronLeftIcon size={24} /></button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} onPointerDown={(e) => e.stopPropagation()} className={`${btn} absolute right-3 top-1/2 hidden -translate-y-1/2 md:flex`}><ChevronRightIcon size={24} /></button>
          </>
        )}
      </div>

      <p className="px-4 py-3 text-center text-[12px] text-secondary">
        <span className="md:hidden">Pinch or double-tap to zoom{many ? " · swipe for more" : ""}</span>
        <span className="hidden md:inline">Scroll or double-click to zoom · drag to move{many ? " · ← → for more" : ""}</span>
      </p>
    </div>,
    document.body,
  );
}
