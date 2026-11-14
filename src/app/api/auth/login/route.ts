import { z } from "zod";
import { startSession, toPublicUser, verifyPassword } from "@/lib/auth";
import { prisma, toUser } from "@/lib/db";
import { HttpError, handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const POST = handler(async (req: Request) => {
  const { email, password } = schema.parse(await req.json());
  await rateLimit(`login:ip:${await clientIp()}`, 20, 600);
  await rateLimit(`login:email:${email}`, 10, 900);
  const row = await prisma.user.findUnique({ where: { email } });
  if (!row || !(await verifyPassword(password, row.passwordHash))) throw new HttpError(401, "Incorrect email or password.");
  const user = toUser(row);
  await startSession(user);
  return { user: toPublicUser(user) };
});
