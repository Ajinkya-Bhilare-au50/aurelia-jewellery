import { z } from "zod";
import { HttpError, handler } from "@/lib/http";
import { devOtpEnabled, devSendOtp, normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Dev-mode only. In Firebase mode the browser sends the SMS through Firebase directly. */
export const POST = handler(async (req: Request) => {
  if (!devOtpEnabled()) throw new HttpError(404, "Not found");
  const { phone: raw } = z.object({ phone: z.string().max(20) }).parse(await req.json());
  const phone = normalizePhone(raw);
  if (!phone) throw new HttpError(400, "Enter a valid 10-digit mobile number.");
  await rateLimit(`otp:ip:${clientIp()}`, 20, 3600);
  await rateLimit(`otp:phone:${phone}`, 5, 600);
  const { challenge, code } = await devSendOtp(phone);
  return { challenge, devCode: code };
});
