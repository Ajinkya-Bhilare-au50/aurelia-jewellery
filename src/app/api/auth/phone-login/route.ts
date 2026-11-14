import { z } from "zod";
import { startSession, toPublicUser } from "@/lib/auth";
import { prisma, toUser } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { verifyPhoneToken } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Sign in with a verified mobile number (OTP already completed on the client). */
export const POST = handler(async (req: Request) => {
  await rateLimit(`phone-login:ip:${clientIp()}`, 20, 600);
  const { phoneToken } = z.object({ phoneToken: z.string().min(10).max(4000) }).parse(await req.json());
  const phone = await verifyPhoneToken(phoneToken);
  const row = await prisma.user.findUnique({ where: { phone } });
  if (!row) throw new HttpError(404, "No account uses this mobile number yet. Create an account to continue.");
  const user = toUser(row);
  await startSession(user);
  return { user: toPublicUser(user) };
});
