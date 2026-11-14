import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MOBILE_OTP } from "@/lib/features";
import { HttpError, handler } from "@/lib/http";
import { normalizePhone, verifyPhoneToken } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";

const TAKEN = "This mobile number is already linked to another account.";

/**
 * Add or change the signed-in user's mobile number.
 * Mobile OTP on: `{ phoneToken }` → verified number. Off: `{ phone }` → stored unverified.
 */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`link-phone:${user.id}`, 10, 3600);
  const body = await req.json();

  let phone: string, verified: boolean;
  if (MOBILE_OTP) {
    const { phoneToken } = z.object({ phoneToken: z.string().min(10).max(4000) }).parse(body);
    phone = await verifyPhoneToken(phoneToken);
    verified = true;
  } else {
    const { phone: raw } = z.object({ phone: z.string().max(20) }).parse(body);
    const p = normalizePhone(raw);
    if (!p) throw new HttpError(400, "Enter a valid 10-digit mobile number.");
    phone = p;
    verified = false;
  }

  if (phone === user.phone && (user.phoneVerified || !verified)) return { phone };
  const taken = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (taken && taken.id !== user.id) throw new HttpError(409, TAKEN);
  try {
    await prisma.user.update({ where: { id: user.id }, data: { phone, phoneVerifiedAt: verified ? new Date() : null } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new HttpError(409, TAKEN);
    throw err;
  }
  return { phone };
});
