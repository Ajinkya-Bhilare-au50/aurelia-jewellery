import { z } from "zod";
import { UPLOADED_RE } from "./productImageUrl";

export const productSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(80),
  category: z.enum(["rings", "necklaces", "earrings", "bracelets"]),
  metal: z.enum(["Gold", "Rose Gold", "Silver", "Platinum"]),
  purity: z.string().trim().min(1).max(10),
  weight: z.string().trim().min(1).max(12),
  price: z.coerce.number().int().min(1).max(10_000_000),
  compareAtPrice: z.coerce.number().int().min(0).max(10_000_000).optional().transform((v) => (v ? v : undefined)),
  stock: z.coerce.number().int().min(0).max(10_000),
  images: z
    .array(
      z
        .string()
        .trim()
        .refine((s) => UPLOADED_RE.test(s) || /^https:\/\/images\.unsplash\.com\/\S+$/.test(s), "Images must be uploaded photos or https://images.unsplash.com/ URLs"),
    )
    .min(1, "Add at least one image")
    .max(6),
  description: z.string().trim().min(10).max(1000),
  featured: z.boolean(),
});

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "3–24 letters, numbers or hyphens"),
  type: z.enum(["percent", "flat"]),
  value: z.coerce.number().int().min(1),
  minOrder: z.coerce.number().int().min(0),
  maxDiscount: z.coerce.number().int().min(0).optional().transform((v) => (v ? v : undefined)),
  usageLimit: z.coerce.number().int().min(0).optional().transform((v) => (v ? v : undefined)),
  // End of the chosen day in India (not the server's timezone, which is UTC on Vercel).
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => (v ? new Date(`${v}T23:59:59+05:30`).toISOString() : undefined)),
  description: z.string().trim().max(120).optional(),
}).refine((c) => c.type !== "percent" || c.value <= 90, { message: "Percent discount cannot exceed 90", path: ["value"] });

export const saleSchema = z
  .object({
    name: z.string().trim().min(2, "Give the sale a name").max(60),
    bannerText: z.string().trim().max(120).optional().transform((v) => v || undefined),
    type: z.enum(["percent", "flat"]),
    value: z.coerce.number().int().min(1, "Discount must be at least 1"),
    scope: z.enum(["all", "categories", "products"]),
    categories: z.array(z.enum(["rings", "necklaces", "earrings", "bracelets"])).default([]),
    productIds: z.array(z.string().min(1)).max(500).default([]),
    startsAt: z.string().datetime({ message: "Choose a start date" }).transform((v) => new Date(v)),
    endsAt: z.string().datetime({ message: "Choose an end date" }).transform((v) => new Date(v)),
    active: z.boolean().default(true),
    stackWithCoupons: z.boolean().default(true),
  })
  .refine((s) => s.type !== "percent" || s.value <= 90, { message: "Percent discount cannot exceed 90", path: ["value"] })
  .refine((s) => s.type !== "flat" || s.value <= 1_000_000, { message: "Flat discount is too large", path: ["value"] })
  .refine((s) => s.endsAt > s.startsAt, { message: "The sale must end after it starts", path: ["endsAt"] })
  .refine((s) => s.scope !== "categories" || s.categories.length > 0, { message: "Pick at least one category", path: ["categories"] })
  .refine((s) => s.scope !== "products" || s.productIds.length > 0, { message: "Pick at least one product", path: ["productIds"] });
