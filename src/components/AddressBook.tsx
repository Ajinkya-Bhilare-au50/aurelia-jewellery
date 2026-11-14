"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Address, SavedAddress } from "@/lib/types";
import { AddressFields, addressLines } from "./AddressFields";
import { PinIcon, PlusIcon } from "./Icons";

const MAX = 10;
const read = (form: HTMLFormElement): Address => {
  const f = new FormData(form);
  const g = (k: string) => String(f.get(k) ?? "").trim();
  return { name: g("name"), phone: g("phone"), line1: g("line1"), line2: g("line2") || undefined, city: g("city"), state: g("state"), pincode: g("pincode") };
};

/** Account page: saved delivery addresses — add, edit, delete, set default. Used by the checkout picker. */
export function AddressBook({ initial }: { initial: SavedAddress[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null); // address id, "new", or null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setList((await api<{ addresses: SavedAddress[] }>("/api/account/addresses")).addresses);
      setEditing(null);
      setConfirmDelete(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const save = (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault();
    const address = read(e.currentTarget);
    const isDefault = new FormData(e.currentTarget).get("isDefault") === "on";
    return run(() => (id === "new" ? api("/api/account/addresses", { address, isDefault }) : api(`/api/account/addresses/${id}`, { address, isDefault }, "PUT")));
  };

  const form = (id: string, a?: SavedAddress) => (
    <form onSubmit={(e) => save(e, id)} className="border border-border p-4">
      <AddressFields defaults={a} idPrefix={`ab-${id}-`} />
      {!a?.isDefault && (
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="isDefault" defaultChecked={!list.length} className="h-4 w-4 accent-gold" /> Use as my default address
        </label>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => { setEditing(null); setError(""); }} disabled={busy}>Cancel</button>
      </div>
    </form>
  );

  const action = "text-[12px] uppercase tracking-[0.12em] text-secondary transition-colors hover:text-ivory disabled:opacity-50";
  return (
    <section id="addresses" className="card scroll-mt-28 p-6">
      <h2 className="flex items-center gap-3 font-display text-2xl"><PinIcon size={22} className="text-gold" /> Saved addresses</h2>
      <p className="mt-2 text-sm text-secondary">Pick one at checkout in a single tap.</p>

      <ul className="mt-5 space-y-3">
        {list.map((a) =>
          editing === a.id ? (
            <li key={a.id}>{form(a.id, a)}</li>
          ) : (
            <li key={a.id} className={`border p-4 text-sm ${a.isDefault ? "border-gold/60" : "border-border"}`}>
              {addressLines(a).map((l, i) => (
                <p key={i} className={i === 0 ? "flex flex-wrap items-center gap-2 font-medium text-ivory" : "mt-0.5 break-words text-secondary"}>
                  {l}
                  {i === 0 && a.isDefault && <span className="badge bg-gold/10 text-gold">Default</span>}
                </p>
              ))}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <button type="button" className={action} disabled={busy} onClick={() => { setEditing(a.id); setConfirmDelete(null); }}>Edit</button>
                {!a.isDefault && <button type="button" className={action} disabled={busy} onClick={() => run(() => api(`/api/account/addresses/${a.id}`, { address: a, isDefault: true }, "PUT"))}>Set as default</button>}
                {confirmDelete === a.id ? (
                  <span className="flex items-center gap-3 text-[12px]">
                    Delete?
                    <button type="button" className="uppercase tracking-[0.12em] text-error hover:underline" disabled={busy} onClick={() => run(() => api(`/api/account/addresses/${a.id}`, undefined, "DELETE"))}>Yes</button>
                    <button type="button" className={action} onClick={() => setConfirmDelete(null)}>No</button>
                  </span>
                ) : (
                  <button type="button" className={`${action} hover:!text-error`} disabled={busy} onClick={() => setConfirmDelete(a.id)}>Delete</button>
                )}
              </div>
            </li>
          ),
        )}
        {list.length === 0 && editing !== "new" && <li className="border border-dashed border-border p-4 text-sm text-secondary">No saved addresses yet. Addresses you use at checkout can be saved here.</li>}
        {editing === "new" && <li>{form("new")}</li>}
      </ul>

      {editing !== "new" && list.length < MAX && (
        <button type="button" onClick={() => { setEditing("new"); setError(""); }} className="btn-secondary btn-sm mt-4 inline-flex items-center gap-2" disabled={busy}>
          <PlusIcon size={16} /> Add address
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-[13px] text-error">{error}</p>}
    </section>
  );
}
