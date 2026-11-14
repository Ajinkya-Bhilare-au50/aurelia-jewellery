import { Prisma } from "@prisma/client";
import { z } from "zod";
import { hashPassword, startSession, toPublicUser } from "@/lib/auth";
import { prisma, toUser, uid } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { verifyPhoneToken } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  referralCode: z.string().trim().toUpperCase().max(20).optional().or(z.literal("")),
  phoneToken: z.string({ required_error: "Please verify your mobile number" }).min(10, "Please verify your mobile number").max(4000),
});

function makeCode(name: string) {
  const base = name.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 6) || "AUR";
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}

export const POST = handler(async (req: Request) => {
  await rateLimit(`register:ip:${await clientIp()}`, 10, 3600);
  const input = schema.parse(await req.json());
  const [phone, passwordHash] = await Promise.all([verifyPhoneToken(input.phoneToken), hashPassword(input.password)]);

  const [emailTaken, phoneTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { phone }, select: { id: true } }),
  ]);
  if (emailTaken) throw new HttpError(409, "An account with this email already exists.");
  if (phoneTaken) throw new HttpError(409, "An account with this mobile number already exists. Sign in with OTP instead.");

  let referredById: string | undefined;
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: input.referralCode }, select: { id: true } });
    if (!referrer) throw new HttpError(400, "That referral code doesn't exist. Check it or leave the field empty.");
    referredById = referrer.id;
  }

  // Unique constraints are the real guard; retry only on a referral-code collision.
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await prisma.user.create({
        data: {
          id: uid("u"),
          name: input.name,
          email: input.email,
          phone,
          phoneVerifiedAt: new Date(),
          passwordHash,
          referralCode: makeCode(input.name),
          referredById,
        },
      });
      const user = toUser(row);
      await startSession(user);
      return { user: toPublicUser(user) };
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
});
