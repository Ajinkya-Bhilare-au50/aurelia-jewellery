import { z } from "zod";
import { createAccount } from "@/lib/accounts";
import { hashPassword, startSession, toPublicUser } from "@/lib/auth";
import { HttpError, handler } from "@/lib/http";
import { verifyPhoneToken } from "@/lib/phone";
import { MOBILE_OTP } from "@/lib/features";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  referralCode: z.string().trim().toUpperCase().max(20).optional().or(z.literal("")),
  phoneToken: z.string({ required_error: "Please verify your mobile number" }).min(10, "Please verify your mobile number").max(4000),
});

export const POST = handler(async (req: Request) => {
  if (!MOBILE_OTP) throw new HttpError(404, "Please sign up with an email code.");
  await rateLimit(`register:ip:${await clientIp()}`, 10, 3600);
  const input = schema.parse(await req.json());
  const [phone, passwordHash] = await Promise.all([verifyPhoneToken(input.phoneToken), hashPassword(input.password)]);
  const user = await createAccount({ name: input.name, email: input.email, phone, passwordHash, referralCode: input.referralCode || undefined });
  await startSession(user);
  return { user: toPublicUser(user) };
});
