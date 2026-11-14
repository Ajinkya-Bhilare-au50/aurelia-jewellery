import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { SignJWT, createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { authkeyConfigured, authkeySendOtp, authkeyVerifyOtp } from "./authkey";
import { DEMO_LOGIN_PHONES, DEMO_OTP, DEMO_SIGNUP_PHONES, isDemoSite } from "./demo";
import { HttpError } from "./http";
import { rateLimit } from "./rateLimit";

/**
 * Phone OTP verification.
 *
 * Firebase mode (NEXT_PUBLIC_FIREBASE_PROJECT_ID set): the browser runs Firebase Phone Auth
 * (reCAPTCHA + SMS) and sends us the resulting Firebase ID token. We verify it against
 * Google's public keys — no service-account key needed — and read the `phone_number` claim.
 *
 * Authkey mode (NEXT_PUBLIC_OTP_PROVIDER=authkey + AUTHKEY_API_KEY + AUTHKEY_OTP_SID): the
 * server sends a real SMS via Authkey (/api/auth/otp/send) and checks the code with Authkey
 * (/api/auth/otp/verify), then issues a short-lived phone token signed with AUTH_SECRET.
 * Demo numbers (demo sites only) skip the SMS and use the fixed demo OTP.
 *
 * Dev mode (no provider configured, never in production): /api/auth/otp/send creates a
 * code, prints it to the server console, and returns a signed challenge; /verify exchanges
 * challenge + code for a short-lived phone token signed with AUTH_SECRET.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
export const firebaseEnabled = () => Boolean(PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
/** Authkey is used only when explicitly selected AND configured (the client reads the same flag). */
export const authkeyEnabled = () => process.env.NEXT_PUBLIC_OTP_PROVIDER === "authkey" && authkeyConfigured();
export const devOtpEnabled = () => !firebaseEnabled() && !authkeyEnabled() && process.env.NODE_ENV !== "production";
/** OTP handled by our own /api/auth/otp/* endpoints (Authkey or dev), rather than by Firebase in the browser. */
export const serverOtpEnabled = () => authkeyEnabled() || devOtpEnabled();

const DEMO_SET = new Set([...DEMO_LOGIN_PHONES, ...DEMO_SIGNUP_PHONES].map((p) => "+91" + p.replace(/\s/g, "")));
const isDemoNumber = (phone: string) => isDemoSite() && DEMO_SET.has(phone);
const SMS_DAILY_CAP = () => Number(process.env.AUTHKEY_DAILY_LIMIT) || 200;

/** Normalise Indian mobile input ("98765 43210", "+91 98765-43210") to E.164. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const MAX_TOKEN_AGE_S = 10 * 60; // the OTP must have been completed in the last 10 minutes

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(`${s || "dev-only-insecure-secret-change-me"}:phone-otp`);
}

/** Verify a phone token from the client and return the verified E.164 number. */
export async function verifyPhoneToken(token: string): Promise<string> {
  const invalid = new HttpError(401, "Mobile verification failed or expired. Please request a new OTP.");
  let alg = "";
  try {
    alg = decodeProtectedHeader(token).alg ?? "";
  } catch {
    throw invalid;
  }
  if (alg === "RS256" && firebaseEnabled()) {
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        algorithms: ["RS256"],
        issuer: `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
      });
      const authTime = Number(payload.auth_time);
      const phone = payload.phone_number;
      if (typeof payload.sub !== "string" || !payload.sub) throw invalid;
      if (!authTime || Date.now() / 1000 - authTime > MAX_TOKEN_AGE_S) throw invalid;
      if (typeof phone !== "string") throw invalid;
      return phone;
    } catch {
      throw invalid;
    }
  }
  if (alg !== "HS256" || !serverOtpEnabled()) throw firebaseEnabled() || serverOtpEnabled() ? invalid : new HttpError(503, "Mobile OTP is not configured.");
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: "phone-verified" });
    if (typeof payload.sub !== "string") throw invalid;
    return payload.sub;
  } catch {
    throw invalid;
  }
}

// ---- Dev-mode OTP (stateless signed challenge) ----

const hashCode = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

async function devSendOtp(phone: string) {
  const code = String(randomInt(100000, 1000000));
  console.log(`\n[dev OTP] ${phone} → ${code}\n`);
  const challenge = await new SignJWT({ h: hashCode(phone, code) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(phone)
    .setAudience("phone-challenge")
    .setExpirationTime("5m")
    .sign(secret());
  return { challenge, code };
}

const signChallenge = (phone: string, claims: Record<string, string>) =>
  new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setSubject(phone).setAudience("phone-challenge").setExpirationTime("10m").sign(secret());

/**
 * Start an OTP for /api/auth/otp/send. Returns a signed challenge the client echoes back on verify.
 * Authkey mode: real SMS (rate-limited per phone and site-wide per day); demo numbers skip SMS.
 */
export async function sendOtp(phone: string): Promise<{ challenge: string; devCode?: string }> {
  if (authkeyEnabled()) {
    if (isDemoNumber(phone)) return { challenge: await signChallenge(phone, { h: hashCode(phone, DEMO_OTP) }) };
    await rateLimit(`otp:phone:${phone}`, 3, 600); // at most 3 SMS per number per 10 minutes
    await rateLimit("otp:sms:daily", SMS_DAILY_CAP(), 86_400); // site-wide cap protects SMS credits from pumping
    const logId = await authkeySendOtp(phone);
    return { challenge: await signChallenge(phone, { lid: logId }) };
  }
  if (devOtpEnabled()) {
    const { challenge, code } = await devSendOtp(phone);
    return { challenge, devCode: code };
  }
  throw new HttpError(404, "Not found");
}

/** Check the code for /api/auth/otp/verify and issue a short-lived phone token. */
export async function verifyOtp(challenge: string, code: string) {
  const fail = new HttpError(400, "Incorrect or expired OTP.");
  let phone: string;
  let lid: string | undefined;
  let h: string | undefined;
  try {
    const { payload } = await jwtVerify(challenge, secret(), { algorithms: ["HS256"], audience: "phone-challenge" });
    phone = String(payload.sub);
    lid = typeof payload.lid === "string" ? payload.lid : undefined;
    h = typeof payload.h === "string" ? payload.h : undefined;
  } catch {
    throw fail;
  }
  await rateLimit(`otp-verify:phone:${phone}`, 8, 600); // stops guessing a 6-digit code
  if (lid) {
    if (!authkeyEnabled() || !(await authkeyVerifyOtp(lid, code))) throw fail;
  } else {
    if (!h) throw fail;
    const a = Buffer.from(hashCode(phone, code));
    const b = Buffer.from(h);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw fail;
  }
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(phone).setAudience("phone-verified").setExpirationTime("10m").sign(secret());
  return { token, phone };
}
