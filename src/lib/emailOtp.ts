import "server-only";
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { createAccount } from "./accounts";
import { hashPassword } from "./auth";
import { prisma, toUser } from "./db";
import { emailConfigured, sendLoginCode } from "./email";
import { HttpError } from "./http";
import { rateLimit } from "./rateLimit";
import type { User } from "./types";

/**
 * Passwordless sign-in AND sign-up by email OTP.
 *  - 6-digit code, valid 10 minutes, single use; the code is HMAC-ed into a signed challenge (stateless).
 *  - A code is emailed to every address, so the send step never reveals whether an account exists.
 *    After a correct code: existing account → signed in; new address → short-lived "email verified"
 *    token used to create the account (name + optional referral code).
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

  if (!emailConfigured()) {
    console.log(`\n[dev email OTP] ${email} → ${code}\n`);
    return { challenge, devCode: code };
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });
  if (!(await sendLoginCode(email, code, user?.name))) throw new HttpError(502, "We couldn't send the email right now. Please try again in a minute.");
  return { challenge };
}

export type EmailOtpResult = { user: User } | { signupToken: string; email: string };

/** Correct, unexpired, unused code → the account, or a token to create one. */
export async function verifyEmailOtp(challenge: string, code: string): Promise<EmailOtpResult> {
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
  if (row) return { user: toUser(row) };
  const signupToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setAudience("email-verified")
    .setExpirationTime("30m")
    .sign(key());
  return { signupToken, email };
}

/** Create an account for an email proven by `verifyEmailOtp`. No password: sign-in is by email (or mobile) OTP. */
export async function signupWithEmail(signupToken: string, name: string, phone: string, referralCode?: string) {
  let email: string;
  try {
    const { payload } = await jwtVerify(signupToken, key(), { algorithms: ["HS256"], audience: "email-verified" });
    email = String(payload.sub);
  } catch {
    throw new HttpError(400, "Your email check has expired. Please request a new code.");
  }
  // Random (unknowable) password: this customer signs in with Email OTP, or mobile OTP once a number is linked.
  const passwordHash = await hashPassword(randomBytes(24).toString("base64url"));
  return createAccount({ name, email, passwordHash, phone, phoneVerified: false, referralCode });
}
