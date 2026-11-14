import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma, toUser } from "./db";
import { HttpError } from "./http";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import type { PublicUser, User } from "./types";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  referralCode: u.referralCode,
  avatarUrl: u.avatarUrl,
});

export async function startSession(user: User) {
  const token = await signSession({ sub: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Full user record for the current request, or null. */
export async function getUser(): Promise<User | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const u = await prisma.user.findUnique({ where: { id: session.sub } });
  return u ? toUser(u) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "Admin access required.");
  return user;
}
