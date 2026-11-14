import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError } from "./http";

/**
 * Phone OTP verification.
 *
 * Firebase mode (NEXT_PUBLIC_FIREBASE_PROJECT_ID set): the browser runs Firebase Phone Auth
 * (reCAPTCHA + SMS) and sends us the resulting Firebase ID token. We verify it against
 * Google's public keys — no service-account key needed — and read the `phone_number` claim.
 *
 * Dev mode (Firebase not configured, never in production): /api/auth/otp/send creates a
 * code, prints it to the server console, and returns a signed challenge; /verify exchanges
 * challenge + code for a short-lived phone token signed with AUTH_SECRET.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
export const firebaseEnabled = () => Boolean(PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
export const devOtpEnabled = () => !firebaseEnabled() && process.env.NODE_ENV !== "production";

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
  if (firebaseEnabled()) {
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
  if (!devOtpEnabled()) throw new HttpError(503, "Mobile OTP is not configured.");
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

export async function devSendOtp(phone: string) {
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

export async function devVerifyOtp(challenge: string, code: string) {
  const fail = new HttpError(400, "Incorrect or expired OTP.");
  let phone: string;
  let h: string;
  try {
    const { payload } = await jwtVerify(challenge, secret(), { algorithms: ["HS256"], audience: "phone-challenge" });
    phone = String(payload.sub);
    h = String(payload.h);
  } catch {
    throw fail;
  }
  const a = Buffer.from(hashCode(phone, code));
  const b = Buffer.from(h);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw fail;
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(phone).setAudience("phone-verified").setExpirationTime("10m").sign(secret());
  return { token, phone };
}
