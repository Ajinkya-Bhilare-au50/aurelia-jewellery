"use client";

import { useRef, useState } from "react";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_PX } from "@/lib/productImageUrl";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon, UploadIcon } from "../Icons";
import Img from "../Img";

const MAX_IMAGES = 6;

/** Shrink big phone photos in the browser (upload limit ~4 MB); the server re-encodes anyway. */
async function shrink(file: File): Promise<Blob> {
  if (file.size <= 1.5 * 1024 * 1024 && file.type !== "image/heic") return file;
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error(`${file.name}: this format can't be read here. Use JPG, PNG or WebP.`);
  });
  const scale = Math.min(1, UPLOAD_MAX_PX / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  if (!blob) throw new Error(`${file.name}: couldn't process this image.`);
  return blob;
}

/**
 * Product photos: upload (multiple), reorder, remove, or add an Unsplash URL.
 * The first photo is the main one. Submits as a hidden "images" field (one URL per line).
 */
export function ProductImagesField({ initial = [] }: { initial?: string[] }) {
  const [images, setImages] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_IMAGES - images.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Only ${MAX_IMAGES} photos per product. ${files.length - room} skipped.`);
    setUploading(list.length);
    for (const file of list) {
      try {
        const blob = await shrink(file);
        if (blob.size > UPLOAD_MAX_BYTES) throw new Error(`${file.name}: too large even after resizing.`);
        const body = new FormData();
        body.append("file", blob, file.name);
        const res = await fetch("/api/admin/images", { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `${file.name}: upload failed.`);
        setImages((imgs) => [...imgs, data.url]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function addUrl() {
    const u = url.trim();
    if (!/^https:\/\/images\.unsplash\.com\/\S+$/.test(u)) return setError("Paste an https://images.unsplash.com/ link.");
    if (images.length >= MAX_IMAGES) return setError(`Only ${MAX_IMAGES} photos per product.`);
    setImages((imgs) => [...imgs, u]);
    setUrl("");
    setError("");
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((imgs) => {
      const next = [...imgs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const iconBtn = "flex h-7 w-7 items-center justify-center bg-background/80 text-ivory transition-colors hover:text-gold disabled:opacity-30";
  return (
    <div>
      <p className="field-label">Photos <span className="normal-case tracking-normal text-secondary">(first one is the main photo, up to {MAX_IMAGES})</span></p>
      <textarea name="images" value={images.join("\n")} readOnly hidden />

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Product photos">
        {images.map((src, i) => (
          <li key={src} className="group relative aspect-[4/5] overflow-hidden border border-border bg-surface">
            <Img src={src} alt={`Photo ${i + 1}`} fill sizes="160px" className="object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 bg-gold px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between p-1">
              <span className="flex gap-1">
                <button type="button" aria-label={`Move photo ${i + 1} left`} disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}><ChevronLeftIcon size={16} /></button>
                <button type="button" aria-label={`Move photo ${i + 1} right`} disabled={i === images.length - 1} onClick={() => move(i, 1)} className={iconBtn}><ChevronRightIcon size={16} /></button>
              </span>
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} className={`${iconBtn} hover:!text-error`}><CloseIcon size={16} /></button>
            </div>
          </li>
        ))}
        {images.length < MAX_IMAGES && (
          <li className="aspect-[4/5]">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading > 0}
              className="flex h-full w-full flex-col items-center justify-center gap-2 border border-dashed border-border text-[12px] text-secondary transition-colors hover:border-gold hover:text-ivory disabled:opacity-60"
            >
              <UploadIcon size={22} />
              {uploading > 0 ? `Uploading ${uploading}…` : "Upload photos"}
            </button>
          </li>
        )}
      </ul>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />

      <div className="mt-4 flex gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          className="input min-w-0 flex-1 font-mono text-[13px]"
          placeholder="…or paste an https://images.unsplash.com/ link"
          aria-label="Unsplash image link"
        />
        <button type="button" onClick={addUrl} className="btn-secondary shrink-0 inline-flex items-center gap-2"><PlusIcon size={16} /> Add</button>
      </div>
      <p className="mt-2 text-[12px] text-secondary">JPG, PNG, WebP or AVIF. Large photos are resized automatically; location data is removed.</p>
      {error && <p role="alert" className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}
