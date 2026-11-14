// Production configuration checks, run once at server start (src/instrumentation.ts).
// Fatal problems stop the server; risky-but-allowed settings are logged as warnings.

export function checkProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;
  const env = process.env;
  const fatal: string[] = [];
  const warn: string[] = [];

  if (!env.DATABASE_URL) fatal.push("DATABASE_URL is not set.");
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || env.AUTH_SECRET.startsWith("change-me")) fatal.push("AUTH_SECRET must be a random string of at least 32 characters.");
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    if (env.ALLOW_DEMO_PAYMENTS === "true") warn.push("Razorpay keys missing and ALLOW_DEMO_PAYMENTS=true: orders can be placed WITHOUT payment.");
    else warn.push("Razorpay keys missing: checkout is disabled until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set.");
  } else if (env.RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
    warn.push("Razorpay TEST keys are in use: no real money will be collected.");
  }
  if (!env.RAZORPAY_WEBHOOK_SECRET) warn.push("RAZORPAY_WEBHOOK_SECRET not set: payments are confirmed only by the browser callback.");
  if (env.NEXT_PUBLIC_OTP_PROVIDER === "authkey") {
    if (!env.AUTHKEY_API_KEY || !env.AUTHKEY_OTP_SID) warn.push("NEXT_PUBLIC_OTP_PROVIDER=authkey but AUTHKEY_API_KEY / AUTHKEY_OTP_SID are missing: falling back to Firebase / no OTP.");
    if (env.AUTHKEY_SEND_BASE_URL || env.AUTHKEY_VERIFY_BASE_URL) warn.push("AUTHKEY_*_BASE_URL is set: these are for local tests only and redirect OTP traffic away from Authkey.");
  } else if (!env.NEXT_PUBLIC_FIREBASE_API_KEY || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    warn.push("No OTP provider configured (Firebase or Authkey): mobile OTP sign-in and registration will not work.");
  }
  if (!env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")) warn.push("NEXT_PUBLIC_SITE_URL should be your https:// domain (used in emails, sitemap, referral links).");
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) warn.push("RESEND_API_KEY / EMAIL_FROM not set: order emails are disabled.");

  for (const w of warn) console.warn(`[config] ${w}`);
  if (fatal.length) {
    for (const f of fatal) console.error(`[config] ${f}`);
    throw new Error(`Invalid production configuration: ${fatal.join(" ")}`);
  }
}
