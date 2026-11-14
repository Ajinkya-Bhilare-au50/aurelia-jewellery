// Browser-only Firebase Phone Auth helpers. Loaded with dynamic import() so the SDK
// is only downloaded when a visitor actually requests an OTP.
import { getApp, getApps, initializeApp } from "firebase/app";
import { RecaptchaVerifier, getAuth, signInWithPhoneNumber, signOut, type ConfirmationResult } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function auth() {
  const app = getApps().length ? getApp() : initializeApp(config);
  const a = getAuth(app);
  a.languageCode = "en";
  return a;
}

let verifier: RecaptchaVerifier | null = null;
let pending: ConfirmationResult | null = null;

/** Sends the SMS. `containerId` is an empty element used by the invisible reCAPTCHA. */
export async function sendFirebaseOtp(phoneE164: string, containerId: string) {
  const a = auth();
  verifier?.clear();
  verifier = new RecaptchaVerifier(a, containerId, { size: "invisible" });
  try {
    pending = await signInWithPhoneNumber(a, phoneE164, verifier);
  } catch (err) {
    verifier.clear();
    verifier = null;
    throw new Error(firebaseMessage(err));
  }
}

/** Confirms the code and returns a Firebase ID token for our server to verify. */
export async function confirmFirebaseOtp(code: string) {
  if (!pending) throw new Error("Please request a new OTP.");
  try {
    const cred = await pending.confirm(code);
    const token = await cred.user.getIdToken();
    await signOut(auth()); // our own session cookie is the source of truth
    return token;
  } catch (err) {
    throw new Error(firebaseMessage(err));
  }
}

function firebaseMessage(err: unknown) {
  const code = (err as { code?: string }).code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-phone-number": "Enter a valid mobile number.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/invalid-verification-code": "Incorrect OTP. Please check and try again.",
    "auth/code-expired": "This OTP has expired. Please request a new one.",
    "auth/quota-exceeded": "SMS limit reached. Please try again later.",
    "auth/captcha-check-failed": "Security check failed. Please refresh and try again.",
    "auth/operation-not-allowed": "Phone sign-in is not enabled for this Firebase project.",
    "auth/unauthorized-domain": "This domain is not authorised in Firebase (Authentication → Settings → Authorised domains).",
  };
  return map[code] ?? "Could not verify your number. Please try again.";
}
