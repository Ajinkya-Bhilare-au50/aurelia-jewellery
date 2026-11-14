"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Avatar } from "./Avatar";
import { AvatarCropper } from "./AvatarCropper";
import { CameraIcon, RefreshIcon, TrashIcon } from "./Icons";

export function AvatarEditor({ id, name, avatarUrl }: { id: string; name: string; avatarUrl?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null); // object URL of the chosen file
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Free the object URL when the dialog closes.
  useEffect(() => () => void (cropSrc && URL.revokeObjectURL(cropSrc)), [cropSrc]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 15 * 1024 * 1024) return setError("That photo is over 15 MB. Please choose a smaller one.");
    setCropSrc(URL.createObjectURL(file));
  }

  async function save(dataUrl: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ avatarUrl: string }>("/api/account/avatar", { dataUrl });
      setPreview(res.avatarUrl);
      setCropSrc(null);
      router.refresh(); // update the header avatar too
    } catch (err) {
      setCropSrc(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError("");
    setBusy(true);
    try {
      await api("/api/account/avatar", undefined, "DELETE");
      setPreview(undefined);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={preview ? "Change profile photo" : "Upload profile photo"}
        className="group relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        <Avatar id={id} name={name} src={preview} size="xl" />
        <span className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-background/60 text-[10px] font-medium uppercase tracking-[0.14em] text-ivory transition-opacity ${busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
          {busy ? <RefreshIcon size={20} className="animate-spin" /> : <CameraIcon size={22} />}
          {busy ? "Saving" : "Change"}
        </span>
        {/* Always-visible camera badge (Teams/WhatsApp style) */}
        <span aria-hidden className="absolute bottom-0.5 right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-gold text-background">
          <CameraIcon size={15} strokeWidth={2} />
        </span>
      </button>
      <div className="flex flex-col items-start gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-tertiary">{preview ? "Change photo" : "Upload photo"}</button>
        {preview && (
          <button type="button" onClick={remove} disabled={busy} className="flex items-center gap-1.5 text-[12px] text-secondary transition-colors hover:text-error">
            <TrashIcon size={14} /> Remove photo
          </button>
        )}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={onFile} />
      {cropSrc && <AvatarCropper src={cropSrc} saving={busy} onCancel={() => setCropSrc(null)} onSave={save} />}
    </div>
  );
}
