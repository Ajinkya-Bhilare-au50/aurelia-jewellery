/**
 * Create the shared demo customer accounts for the demo login numbers (idempotent).
 *   npm run demo:accounts        (uses DATABASE_URL from .env, i.e. your Neon database)
 * Numbers that already belong to an account are left untouched.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { DEMO_ADMIN, DEMO_LOGIN_PHONES } from "../src/lib/demo";

const prisma = new PrismaClient();

(async () => {
  for (const [i, display] of DEMO_LOGIN_PHONES.entries()) {
    const phone = "+91" + display.replace(/\s/g, "");
    const existing = await prisma.user.findUnique({ where: { phone }, select: { email: true } });
    if (existing) {
      console.log(`- ${display}: already has an account, left as is`);
      continue;
    }
    const n = i + 1;
    await prisma.user.create({
      data: {
        id: `u_demo${n}_${crypto.randomBytes(3).toString("hex")}`,
        name: `Demo Customer ${n}`,
        email: `demo${n}@aurelia.test`,
        phone,
        phoneVerifiedAt: new Date(),
        // Random password: these accounts are meant for mobile-OTP sign-in only.
        passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("base64url"), 10),
        referralCode: `DEMO${n}${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
        referralDiscountUsed: true,
      },
    });
    console.log(`✓ ${display}: created Demo Customer ${n}`);
  }
  // Read-only demo admin (public credentials are safe: role demo_admin can't change anything).
  const admin = await prisma.user.findUnique({ where: { email: DEMO_ADMIN.email }, select: { role: true } });
  if (admin && admin.role !== "demo_admin") {
    console.log(`! ${DEMO_ADMIN.email} exists with role ${admin.role}; not changed`);
  } else {
    await prisma.user.upsert({
      where: { email: DEMO_ADMIN.email },
      update: { role: "demo_admin", passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 10) },
      create: {
        id: `u_demoadmin_${crypto.randomBytes(3).toString("hex")}`,
        name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email,
        role: "demo_admin",
        passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 10),
        referralCode: `DEMOADM${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
        referralDiscountUsed: true,
      },
    });
    console.log(`✓ ${DEMO_ADMIN.email}: read-only demo admin ready`);
  }
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
