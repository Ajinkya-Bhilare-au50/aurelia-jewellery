import { z } from "zod";
import { startEmailOtp } from "@/lib/emailOtp";
import { handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254) });

/** Email a one-time sign-in code. Same response whether or not the email has an account. */
export const POST = handler(async (req: Request) => {
  await rateLimit(`email-otp:ip:${await clientIp()}`, 10, 3600);
  const { email } = schema.parse(await req.json());
  return startEmailOtp(email);
});
