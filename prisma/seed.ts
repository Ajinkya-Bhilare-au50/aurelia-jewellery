/**
 * Seed the Postgres database.
 *  - `npm run db:seed`       (dev): demo catalogue + demo accounts (add `--import-json` to migrate `.data/db.json`).
 *  - `npm run db:seed:prod` (live): catalogue + active coupons ONLY — no demo accounts, no orders.
 *    Then create your admin with `npm run admin:create`.
 * Safe to re-run: existing rows (same id) are left untouched.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { buildSeed } from "../src/lib/seed";
import type { DB } from "../src/lib/types";

const prisma = new PrismaClient();
const date = (s?: string) => (s ? new Date(s) : undefined);

async function main() {
  const production = process.argv.includes("--production");
  const legacy = path.join(process.cwd(), ".data", "db.json");
  // One-time migration from the old JSON store is opt-in: `npx tsx prisma/seed.ts --import-json`.
  const fromFile = !production && process.argv.includes("--import-json") && existsSync(legacy);
  const db: DB = fromFile ? JSON.parse(readFileSync(legacy, "utf8")) : buildSeed();
  if (production) {
    db.users = [];
    db.orders = [];
    db.coupons = db.coupons.filter((c) => !c.ownerId && (!c.expiresAt || new Date(c.expiresAt) > new Date()));
  }
  console.log(production ? "Seeding production catalogue (no demo accounts) …" : fromFile ? "Importing .data/db.json …" : "Seeding demo data …");
  if (fromFile) {
    // Give the demo accounts their demo mobile numbers (the JSON store pre-dates phone OTP).
    const demo = new Map(buildSeed().users.map((u) => [u.id, u]));
    for (const u of db.users) if (!u.phone && demo.get(u.id)?.phone) Object.assign(u, { phone: demo.get(u.id)!.phone, phoneVerified: true });
  }

  // Users without referrer first, then the rest (self-relation).
  const users = [...db.users].sort((a, b) => Number(Boolean(a.referredBy)) - Number(Boolean(b.referredBy)));
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        phoneVerifiedAt: u.phone && u.phoneVerified !== false ? new Date() : undefined,
        passwordHash: u.passwordHash,
        role: u.role,
        referralCode: u.referralCode,
        referredById: u.referredBy,
        referralDiscountUsed: u.referralDiscountUsed,
        createdAt: date(u.createdAt),
      },
    });
  }

  await prisma.product.createMany({
    skipDuplicates: true,
    data: db.products.map((p) => ({ ...p, compareAtPrice: p.compareAtPrice ?? null, createdAt: date(p.createdAt) })),
  });

  await prisma.coupon.createMany({
    skipDuplicates: true,
    data: db.coupons.map((c) => ({ ...c, expiresAt: date(c.expiresAt), createdAt: date(c.createdAt) })),
  });

  await prisma.order.createMany({
    skipDuplicates: true,
    data: db.orders.map((o) => ({
      id: o.id,
      number: o.number,
      userId: o.userId,
      email: o.email,
      items: JSON.parse(JSON.stringify(o.items)),
      address: JSON.parse(JSON.stringify(o.address)),
      subtotal: o.subtotal,
      discount: o.discount,
      discountLabel: o.discountLabel,
      couponCode: o.couponCode,
      referralApplied: o.referralApplied,
      shipping: o.shipping,
      total: o.total,
      status: o.status,
      timeline: JSON.parse(JSON.stringify(o.timeline)),
      paymentProvider: o.payment.provider,
      razorpayOrderId: o.payment.razorpayOrderId,
      paymentId: o.payment.paymentId,
      courier: o.courier,
      awb: o.awb,
      createdAt: date(o.createdAt),
    })),
  });

  // Order numbers continue from the highest of the stored sequence and existing orders.
  const maxExisting = Math.max(db.orderSeq, ...db.orders.map((o) => Number(o.number.replace(/\D/g, "")) || 0));
  await prisma.counter.upsert({ where: { id: "order" }, update: {}, create: { id: "order", value: maxExisting } });

  const counts = await Promise.all([prisma.user.count(), prisma.product.count(), prisma.coupon.count(), prisma.order.count()]);
  console.log(`Done. users=${counts[0]} products=${counts[1]} coupons=${counts[2]} orders=${counts[3]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
