import { z } from "zod";
import { HttpError, handler } from "@/lib/http";
import { serverOtpEnabled, verifyOtp } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Exchange challenge + code for a short-lived phone token (Authkey or dev mode). */
export const POST = handler(async (req: Request) => {
  if (!serverOtpEnabled()) throw new HttpError(404, "Not found");
  await rateLimit(`otp-verify:ip:${await clientIp()}`, 30, 600);
  const { challenge, code } = z
    .object({ challenge: z.string().max(2000), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") })
    .parse(await req.json());
  return verifyOtp(challenge, code);
});
