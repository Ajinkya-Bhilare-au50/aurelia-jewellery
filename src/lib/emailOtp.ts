import "server-only";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma, toUser } from "./db";
import { emailConfigured, sendLoginCode } from "./email";
import { HttpError } from "./http";
import { rateLimit } from "./rateLimit";

/**
 * Passwordless sign-in by email OTP.
 *  - 6-digit code, valid 10 minutes, single use; the code is HMAC-ed into a signed challenge (stateless).
 *  - Never reveals whether an email has an account: the response is identical either way.
 *  - Limits: 3 codes / address / 10 min, 5 guesses / address / 10 min, site-wide daily cap.
 * Without an email transport: dev shows the code on screen; production returns 503.
 */
const RAW = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return `${s || "dev-only-insecure-secret-change-me"}:email-otp`;
};
const key = () => new TextEncoder().encode(RAW());
const mac = (email: string, code: string) => createHmac("sha256", RAW()).update(`${email}:${code}`).digest("hex");

export const emailOtpAvailable = () => emailConfigured() || process.env.NODE_ENV !== "production";

export async function startEmailOtp(email: string): Promise<{ challenge: string; devCode?: string }> {
  if (!emailOtpAvailable()) throw new HttpError(503, "Email sign-in isn't available right now. Please use another method.");
  await rateLimit(`email-otp:addr:${email}`, 3, 600);
  await rateLimit("email-otp:daily", Number(process.env.EMAIL_OTP_DAILY_LIMIT) || 300, 86_400);

  const code = String(randomInt(100000, 1000000));
  const challenge = await new SignJWT({ h: mac(email, code) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setAudience("email-challenge")
    .setJti(randomUUID())
    .setExpirationTime("10m")
    .sign(key());

  const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });
  if (!user) return { challenge }; // same response as success: no account enumeration
  if (emailConfigured()) {
    if (!(await sendLoginCode(email, code, user.name))) throw new HttpError(502, "We couldn't send the email right now. Please try again in a minute.");
    return { challenge };
  }
  console.log(`\n[dev email OTP] ${email} → ${code}\n`);
  return { challenge, devCode: code };
}

/** Returns the signed-in user for a correct, unexpired, unused code. */
export async function verifyEmailOtp(challenge: string, code: string) {
  const fail = new HttpError(400, "Incorrect or expired code. Please request a new one.");
  let email: string, h: string, jti: string;
  try {
    const { payload } = await jwtVerify(challenge, key(), { algorithms: ["HS256"], audience: "email-challenge" });
    email = String(payload.sub);
    h = String(payload.h);
    jti = String(payload.jti);
  } catch {
    throw fail;
  }
  await rateLimit(`email-otp:verify:${email}`, 5, 600);
  const a = Buffer.from(mac(email, code));
  const b = Buffer.from(h);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw fail;
  try {
    await rateLimit(`email-otp:used:${jti}`, 1, 900); // single use
  } catch {
    throw new HttpError(400, "This code has already been used. Please request a new one.");
  }
  const row = await prisma.user.findUnique({ where: { email } });
  if (!row) throw fail;
  return toUser(row);
}
