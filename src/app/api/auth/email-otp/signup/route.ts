import { z } from "zod";
import { startSession, toPublicUser } from "@/lib/auth";
import { signupWithEmail } from "@/lib/emailOtp";
import { handler } from "@/lib/http";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  signupToken: z.string().max(2000),
  name: z.string().trim().min(2, "Please enter your full name").max(60),
  phone: z
    .string({ required_error: "Enter your mobile number" })
    .max(20)
    .transform((s, ctx) => normalizePhone(s) ?? (ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" }), z.NEVER)),
  referralCode: z.string().trim().toUpperCase().max(20).optional().or(z.literal("")),
});

/** Finish an email-OTP sign-up (email already proven by the code). */
export const POST = handler(async (req: Request) => {
  await rateLimit(`register:ip:${await clientIp()}`, 10, 3600);
  const input = schema.parse(await req.json());
  const user = await signupWithEmail(input.signupToken, input.name, input.phone, input.referralCode || undefined);
  await startSession(user);
  return { user: toPublicUser(user) };
});
