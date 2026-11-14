/**
 * Admin account management (runs against DATABASE_URL in .env — point it at Neon for live).
 *
 *   npm run admin:create                 interactive: email, name, password (hidden)
 *   npm run admin:create -- --email you@shop.in --name "Your Name"
 *   npm run admin:remove-demo            delete the demo accounts (admin@aurelia.test, ajinkya@aurelia.test)
 *
 * `create` also promotes an existing customer account with that email to admin and resets its password.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

const prisma = new PrismaClient();
const DEMO_EMAILS = ["admin@aurelia.test", "ajinkya@aurelia.test", "priya@aurelia.test"]; // priya: pre-rename demo account

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Mask typed characters.
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.startsWith(question)) process.stdout.write(question);
        else if (s.includes("\n") || s.includes("\r")) process.stdout.write("\n");
        else process.stdout.write("*");
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function strong(pw: string) {
  return pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
}

async function create() {
  const email = (arg("email") ?? (await ask("Admin email: "))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email.");
  if (DEMO_EMAILS.includes(email)) throw new Error("Use your own email, not a demo account.");
  const name = arg("name") ?? (await ask("Full name: "));
  if (name.length < 2) throw new Error("Name is required.");

  const password = process.env.ADMIN_PASSWORD ?? (await ask("Password (min 12 chars, upper, lower, digit): ", true));
  if (!strong(password)) throw new Error("Password too weak: use at least 12 characters with upper-case, lower-case and a digit.");
  if (!process.env.ADMIN_PASSWORD && (await ask("Repeat password: ", true)) !== password) throw new Error("Passwords do not match.");

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: "admin", passwordHash, name } });
    console.log(`✓ ${email} is now an admin (password reset).`);
    return;
  }
  const base = name.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 6) || "ADMIN";
  for (let i = 0; i < 10; i++) {
    const referralCode = `${base}${Math.floor(100 + Math.random() * 900)}`;
    if (await prisma.user.findUnique({ where: { referralCode } })) continue;
    await prisma.user.create({
      data: { id: `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, email, name, passwordHash, role: "admin", referralCode, referralDiscountUsed: true },
    });
    console.log(`✓ Admin ${email} created. Sign in at /login → "Email & password".`);
    return;
  }
  throw new Error("Could not generate a referral code, try again.");
}

async function removeDemo() {
  for (const email of DEMO_EMAILS) {
    const u = await prisma.user.findUnique({ where: { email }, include: { _count: { select: { orders: true } } } });
    if (!u) {
      console.log(`- ${email}: not present`);
      continue;
    }
    if (u._count.orders > 0) {
      // Keep order history intact; lock the account instead of deleting it.
      await prisma.user.update({
        where: { email },
        data: { role: "customer", passwordHash: await bcrypt.hash(crypto.randomUUID(), 10), phone: null, phoneVerifiedAt: null },
      });
      console.log(`✓ ${email}: has orders, so it was locked (random password, demoted, phone removed).`);
    } else {
      await prisma.user.updateMany({ where: { referredById: u.id }, data: { referredById: null } });
      await prisma.user.delete({ where: { email } });
      console.log(`✓ ${email}: deleted.`);
    }
  }
  const admins = await prisma.user.count({ where: { role: "admin" } });
  if (admins === 0) console.warn("⚠ No admin accounts left. Run: npm run admin:create");
}

const cmd = process.argv[2];
(cmd === "create" ? create() : cmd === "remove-demo" ? removeDemo() : Promise.reject(new Error("Usage: tsx scripts/admin.ts <create|remove-demo>")))
  .catch((e) => {
    console.error(`✗ ${(e as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
