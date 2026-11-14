import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { verifyPhoneToken } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Add or change the signed-in user's verified mobile number. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`link-phone:${user.id}`, 10, 3600);
  const { phoneToken } = z.object({ phoneToken: z.string().min(10).max(4000) }).parse(await req.json());
  const phone = await verifyPhoneToken(phoneToken);
  const taken = await prisma.user.findUnique({ where: { phone } });
  if (taken && taken.id !== user.id) throw new HttpError(409, "This mobile number is already linked to another account.");
  await prisma.user.update({ where: { id: user.id }, data: { phone, phoneVerifiedAt: new Date() } });
  return { phone };
});
