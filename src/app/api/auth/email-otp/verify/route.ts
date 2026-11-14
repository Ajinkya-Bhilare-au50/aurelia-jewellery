import { z } from "zod";
import { startSession, toPublicUser } from "@/lib/auth";
import { verifyEmailOtp } from "@/lib/emailOtp";
import { handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({ challenge: z.string().max(2000), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

/** Check the emailed code: existing account → signed in; new email → token to finish sign-up. */
export const POST = handler(async (req: Request) => {
  await rateLimit(`email-otp-verify:ip:${await clientIp()}`, 30, 600);
  const { challenge, code } = schema.parse(await req.json());
  const res = await verifyEmailOtp(challenge, code);
  if ("signupToken" in res) return { signup: true, signupToken: res.signupToken, email: res.email };
  await startSession(res.user);
  return { user: toPublicUser(res.user) };
});
