"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AVATAR_MAX_BYTES, AVATAR_PX } from "@/lib/avatar";
import { ZoomInIcon, ZoomOutIcon } from "./Icons";

const VIEW = 280; // on-screen crop circle diameter (px)
const MAX_ZOOM = 4;

type Pos = { x: number; y: number }; // image top-left relative to the circle's box

/**
 * Circular crop dialog: drag to reposition, slider / wheel / keys to zoom.
 * Exactly what is inside the circle is exported as an AVATAR_PX square (shown as a circle everywhere).
 */
export function AvatarCropper({ src, onCancel, onSave, saving }: { src: string; onCancel: () => void; onSave: (dataUrl: string) => void; saving: boolean }) {
  const img = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const drag = useRef<{ id: number; sx: number; sy: number; start: Pos } | null>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);

  const scaleFor = useCallback((z: number) => (natural ? (VIEW / Math.min(natural.w, natural.h)) * z : 1), [natural]);

  // Keep the image covering the whole circle box.
  const clamp = useCallback(
    (p: Pos, z: number): Pos => {
      if (!natural) return p;
      const s = scaleFor(z);
      return { x: Math.min(0, Math.max(VIEW - natural.w * s, p.x)), y: Math.min(0, Math.max(VIEW - natural.h * s, p.y)) };
    },
    [natural, scaleFor],
  );

  // Load + centre.
  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      img.current = i;
      setNatural({ w: i.naturalWidth, h: i.naturalHeight });
      const s = VIEW / Math.min(i.naturalWidth, i.naturalHeight);
      setPos({ x: (VIEW - i.naturalWidth * s) / 2, y: (VIEW - i.naturalHeight * s) / 2 });
      setZoom(1);
      saveBtn.current?.focus();
    };
    i.onerror = () => setError("We couldn't open that image. Please choose a JPG, PNG or WebP photo.");
    i.src = src;
  }, [src]);

  // Zoom around the centre of the circle.
  const zoomTo = useCallback(
    (next: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, next));
      setPos((p) => {
        const s0 = scaleFor(zoom);
        const s1 = scaleFor(z);
        const cx = (VIEW / 2 - p.x) / s0;
        const cy = (VIEW / 2 - p.y) / s0;
        return clamp({ x: VIEW / 2 - cx * s1, y: VIEW / 2 - cy * s1 }, z);
      });
      setZoom(z);
    },
    [zoom, scaleFor, clamp],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  // Lock page scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, []);

  // Wheel zoom needs a non-passive listener so the page behind doesn't scroll.
  const area = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoomTo);
  zoomRef.current = zoomTo;
  const zoomVal = useRef(zoom);
  zoomVal.current = zoom;
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current(zoomVal.current - e.deltaY * 0.0015);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, start: pos };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setPos(clamp({ x: d.start.x + e.clientX - d.sx, y: d.start.y + e.clientY - d.sy }, zoom));
  }
  const onPointerUp = () => (drag.current = null);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 20 : 6;
    const moves: Record<string, Pos> = { ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step } };
    if (moves[e.key]) {
      e.preventDefault();
      setPos((p) => clamp({ x: p.x + moves[e.key].x, y: p.y + moves[e.key].y }, zoom));
    } else if (e.key === "+" || e.key === "=") zoomTo(zoom + 0.1);
    else if (e.key === "-") zoomTo(zoom - 0.1);
  }

  function save() {
    if (!img.current || !natural) return;
    const s = scaleFor(zoom);
    const side = VIEW / s; // source square in image pixels
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_PX;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.current, -pos.x / s, -pos.y / s, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    // WebP where supported (Safari falls back to PNG), then JPEG if still too big.
    let url = canvas.toDataURL("image/webp", 0.86);
    if (!url.startsWith("data:image/webp") || url.length * 0.75 > AVATAR_MAX_BYTES) url = canvas.toDataURL("image/jpeg", 0.85);
    onSave(url);
  }

  const s = scaleFor(zoom);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-title" onClick={(e) => e.target === e.currentTarget && !saving && onCancel()}>
      <div className="w-full max-w-sm border border-border bg-surface p-6 sm:p-8">
        <h2 id="crop-title" className="font-display text-2xl">Adjust your photo</h2>
        <p className="mt-1 text-[13px] text-secondary">Drag to reposition. Use the slider to zoom.</p>

        <div className="mt-6 flex justify-center">
          <div
            ref={area}
            tabIndex={0}
            role="application"
            aria-label="Photo position. Use arrow keys to move, plus and minus to zoom."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            style={{ width: VIEW, height: VIEW }}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-full bg-surface-muted ring-1 ring-gold/60 ring-offset-4 ring-offset-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
          >
            {natural && (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                style={{ width: natural.w * s, height: natural.h * s, transform: `translate(${pos.x}px, ${pos.y}px)` }}
              />
            )}
            {!natural && !error && <div className="skeleton absolute inset-0" />}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button type="button" aria-label="Zoom out" onClick={() => zoomTo(zoom - 0.2)} className="grid h-9 w-9 place-items-center text-secondary transition-colors hover:text-ivory"><ZoomOutIcon size={18} /></button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1 flex-1 cursor-pointer accent-gold"
          />
          <button type="button" aria-label="Zoom in" onClick={() => zoomTo(zoom + 0.2)} className="grid h-9 w-9 place-items-center text-secondary transition-colors hover:text-ivory"><ZoomInIcon size={18} /></button>
        </div>

        {error && <p role="alert" className="mt-4 text-[13px] text-error">{error}</p>}

        <div className="mt-8 flex items-center justify-end gap-4">
          <button type="button" onClick={onCancel} disabled={saving} className="btn-tertiary">Cancel</button>
          <button ref={saveBtn} type="button" onClick={save} disabled={!natural || saving} className="btn-primary">{saving ? "Saving…" : "Save photo"}</button>
        </div>
      </div>
    </div>
  );
}
