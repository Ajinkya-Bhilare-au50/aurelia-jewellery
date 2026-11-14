import { z } from "zod";
import { HttpError, handler } from "@/lib/http";
import { normalizePhone, sendOtp, serverOtpEnabled } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Server-side OTP (Authkey SMS, or dev mode). In Firebase mode the browser sends the SMS through Firebase. */
export const POST = handler(async (req: Request) => {
  if (!serverOtpEnabled()) throw new HttpError(404, "Not found");
  const { phone: raw } = z.object({ phone: z.string().max(20) }).parse(await req.json());
  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Enter a valid 10-digit mobile number.");
  await rateLimit(`otp:ip:${await clientIp()}`, 10, 3600);
  return sendOtp(phone);
});
