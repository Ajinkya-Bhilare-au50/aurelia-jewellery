import { z } from "zod";
import { HttpError, handler } from "@/lib/http";
import { devOtpEnabled, devVerifyOtp } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Dev-mode only: exchange challenge + code for a phone token. */
export const POST = handler(async (req: Request) => {
  if (!devOtpEnabled()) throw new HttpError(404, "Not found");
  await rateLimit(`otp-verify:ip:${clientIp()}`, 30, 600);
  const { challenge, code } = z.object({ challenge: z.string().max(2000), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }).parse(await req.json());
  return devVerifyOtp(challenge, code);
});
