import "server-only";
import type { SavedAddress as Row } from "@prisma/client";
import { z } from "zod";
import { prisma, uid } from "./db";
import { HttpError } from "./http";
import type { Address, SavedAddress } from "./types";

export const MAX_ADDRESSES = 10;

/** One delivery address (checkout + address book). */
export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name").max(60),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(3, "Enter your address").max(120),
  line2: z.string().trim().max(120).optional().transform((v) => v || undefined),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Choose your state").max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
});

export type { SavedAddress } from "./types";

export const toSavedAddress = (r: Row): SavedAddress => ({
  id: r.id, name: r.name, phone: r.phone, line1: r.line1, line2: r.line2 ?? undefined, city: r.city, state: r.state, pincode: r.pincode, isDefault: r.isDefault,
});

/** Default first, then most recently used/updated. */
export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  const rows = await prisma.savedAddress.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
  return rows.map(toSavedAddress);
}

const key = (a: Address) => [a.name, a.phone, a.line1, a.line2 ?? "", a.city, a.state, a.pincode].map((s) => s.trim().toLowerCase().replace(/\s+/g, " ")).join("|");

/**
 * Save an address to the user's book. An identical address is not duplicated (it is just touched,
 * and made default if asked). The first address saved becomes the default.
 */
export async function saveAddress(userId: string, a: Address, opts: { makeDefault?: boolean } = {}): Promise<SavedAddress> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.savedAddress.findMany({ where: { userId } });
    const same = existing.find((r) => key(toSavedAddress(r)) === key(a));
    const makeDefault = opts.makeDefault || existing.length === 0 || Boolean(same?.isDefault);
    if (makeDefault) await tx.savedAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    if (same) return toSavedAddress(await tx.savedAddress.update({ where: { id: same.id }, data: { isDefault: makeDefault } }));
    if (existing.length >= MAX_ADDRESSES) throw new HttpError(400, `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
    const row = await tx.savedAddress.create({
      data: { id: uid("adr"), userId, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? null, city: a.city, state: a.state, pincode: a.pincode, isDefault: makeDefault },
    });
    return toSavedAddress(row);
  });
}

export async function updateAddress(userId: string, id: string, a: Address, makeDefault: boolean) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.savedAddress.findFirst({ where: { id, userId } });
    if (!row) throw new HttpError(404, "Address not found.");
    if (makeDefault) await tx.savedAddress.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } });
    return toSavedAddress(
      await tx.savedAddress.update({
        where: { id },
        data: { name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? null, city: a.city, state: a.state, pincode: a.pincode, isDefault: makeDefault || row.isDefault },
      }),
    );
  });
}

/** Delete; if it was the default, the most recently updated remaining address becomes the default. */
export async function deleteAddress(userId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    const row = await tx.savedAddress.findFirst({ where: { id, userId } });
    if (!row) throw new HttpError(404, "Address not found.");
    await tx.savedAddress.delete({ where: { id } });
    if (row.isDefault) {
      const next = await tx.savedAddress.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
      if (next) await tx.savedAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}
