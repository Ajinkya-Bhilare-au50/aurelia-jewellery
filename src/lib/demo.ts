// Demo / portfolio helpers. The phone numbers below are configured as Firebase *test numbers*
// (fixed OTP, no SMS is sent) in project aurelia-jewellery-53vr. Firebase allows up to 10.
export const DEMO_OTP = "123456";

/** Shared demo customer accounts (created by `npm run demo:accounts`): sign in instantly by OTP. */
export const DEMO_LOGIN_PHONES = ["98765 43210", "98765 43211", "98765 43212", "98765 43213", "98765 43214"];

/** Left unregistered so visitors can try sign-up; each can be registered once. */
export const DEMO_SIGNUP_PHONES = ["98765 43215", "98765 43216", "98765 43217", "98765 43218", "98765 43219"];

/** Public read-only admin (role demo_admin): browses the admin panel, every change is refused, customer data masked. */
export const DEMO_ADMIN = { email: "demo-admin@aurelia.test", password: "DemoAdmin@123", name: "Demo Admin (read-only)" };

/**
 * Show demo hints only on a demo deployment (local dev, or ALLOW_DEMO_PAYMENTS=true in production).
 * A real shop with real payments never shows them.
 */
export const isDemoSite = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true";
