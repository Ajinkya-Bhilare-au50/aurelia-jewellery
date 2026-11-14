"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { Product } from "@/lib/types";
import { ProductImagesField } from "./ProductImagesField";

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(f),
      featured: f.get("featured") === "on",
      images: String(f.get("images") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      compareAtPrice: f.get("compareAtPrice") || undefined,
    };
    try {
      if (product) await api(`/api/admin/products/${product.id}`, body, "PUT");
      else await api("/api/admin/products", body);
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${product.id}`, undefined, "DELETE");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const sel = "input cursor-pointer";
  return (
    <form onSubmit={onSubmit} className="card grid gap-6 p-6 sm:grid-cols-2 lg:p-8">
      <div>
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={product?.name} className="input" onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))} />
      </div>
      <div>
        <label className="field-label" htmlFor="slug">URL slug</label>
        <input id="slug" name="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} className="input" />
      </div>
      <div>
        <label className="field-label" htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={product?.category ?? "rings"} className={sel}>
          <option value="rings">Rings</option><option value="necklaces">Necklaces</option><option value="earrings">Earrings</option><option value="bracelets">Bracelets</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="metal">Metal</label>
        <select id="metal" name="metal" defaultValue={product?.metal ?? "Gold"} className={sel}>
          {["Gold", "Rose Gold", "Silver", "Platinum"].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="field-label" htmlFor="purity">Purity</label><input id="purity" name="purity" required defaultValue={product?.purity ?? "18K"} className="input" /></div>
        <div><label className="field-label" htmlFor="weight">Weight</label><input id="weight" name="weight" required defaultValue={product?.weight ?? ""} placeholder="3.2 g" className="input" /></div>
      </div>
      <div><label className="field-label" htmlFor="stock">Stock</label><input id="stock" name="stock" type="number" min={0} required defaultValue={product?.stock ?? 1} className="input" /></div>
      <div><label className="field-label" htmlFor="price">Price (₹)</label><input id="price" name="price" type="number" min={1} required defaultValue={product?.price} className="input" /></div>
      <div><label className="field-label" htmlFor="compareAtPrice">Compare-at price (₹, optional)</label><input id="compareAtPrice" name="compareAtPrice" type="number" min={0} defaultValue={product?.compareAtPrice} className="input" /></div>
      <div className="sm:col-span-2">
        <ProductImagesField initial={product?.images} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="description">Description</label>
        <textarea id="description" name="description" required rows={4} defaultValue={product?.description} className="input h-auto py-3" />
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4 accent-gold" /> Feature on the home page
      </label>
      {error && <p role="alert" className="text-sm text-error sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6 sm:col-span-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : product ? "Save changes" : "Create product"}</button>
        {product && !confirmDelete && <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto text-[12px] uppercase tracking-[0.12em] text-error hover:underline">Delete product</button>}
        {product && confirmDelete && (
          <span className="ml-auto flex items-center gap-3 text-sm">
            Delete permanently?
            <button type="button" onClick={onDelete} className="btn-danger btn-sm" disabled={busy}>Delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary btn-sm">Keep</button>
          </span>
        )}
      </div>
    </form>
  );
}
