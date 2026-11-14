/**
 * Feature switches (safe to import from client and server components).
 *
 * MOBILE_OTP: mobile-number OTP (Firebase / Authkey) for sign-in, sign-up and linking a phone.
 * Off: customers sign in / sign up with Email OTP (or password for existing password accounts).
 * The mobile OTP code is kept; set this to true to bring it back.
 */
export const MOBILE_OTP = false;
