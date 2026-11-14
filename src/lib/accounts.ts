import "server-only";
import { Prisma } from "@prisma/client";
import { prisma, toUser, uid } from "./db";
import { HttpError } from "./http";
import type { User } from "./types";

function makeCode(name: string) {
  const base = name.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 6) || "AUR";
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Create a customer account (mobile-OTP sign-up and email-OTP sign-up share this).
 * Checks referral code and duplicates; unique constraints are the real guard.
 */
export async function createAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  /** false = typed in, not OTP-verified (default true when a phone is given) */
  phoneVerified?: boolean;
  referralCode?: string;
}): Promise<User> {
  const [emailTaken, phoneTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    input.phone ? prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } }) : null,
  ]);
  if (emailTaken) throw new HttpError(409, "An account with this email already exists.");
  if (phoneTaken) throw new HttpError(409, "This mobile number is already registered to another account.");

  let referredById: string | undefined;
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: input.referralCode }, select: { id: true } });
    if (!referrer) throw new HttpError(400, "That referral code doesn't exist. Check it or leave the field empty.");
    referredById = referrer.id;
  }

  // Retry only on a referral-code collision.
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await prisma.user.create({
        data: {
          id: uid("u"),
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          phoneVerifiedAt: input.phone && input.phoneVerified !== false ? new Date() : null,
          passwordHash: input.passwordHash,
          referralCode: makeCode(input.name),
          referredById,
        },
      });
      return toUser(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = String((err.meta?.target as string[] | undefined) ?? "");
        if (target.includes("email")) throw new HttpError(409, "An account with this email already exists.");
        if (target.includes("phone")) throw new HttpError(409, "An account with this mobile number already exists.");
        if (attempt < 5) continue;
      }
      throw err;
    }
  }
}
