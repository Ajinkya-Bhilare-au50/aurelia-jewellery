import { z } from "zod";
import { startSession, toPublicUser } from "@/lib/auth";
import { prisma, toUser } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { verifyPhoneToken } from "@/lib/phone";
import { MOBILE_OTP } from "@/lib/features";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Sign in with a verified mobile number (OTP already completed on the client). */
export const POST = handler(async (req: Request) => {
  if (!MOBILE_OTP) throw new HttpError(404, "Mobile sign-in is turned off. Please use Email OTP.");
  await rateLimit(`phone-login:ip:${await clientIp()}`, 20, 600);
  const { phoneToken } = z.object({ phoneToken: z.string().min(10).max(4000) }).parse(await req.json());
  const phone = await verifyPhoneToken(phoneToken);
  const row = await prisma.user.findUnique({ where: { phone } });
  if (!row || !row.phoneVerifiedAt) throw new HttpError(404, "No account uses this mobile number yet. Create an account to continue.");
  const user = toUser(row);
  await startSession(user);
  return { user: toPublicUser(user) };
});
