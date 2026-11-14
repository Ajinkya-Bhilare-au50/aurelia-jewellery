import "server-only";
import { HttpError } from "./http";

/**
 * Authkey.io 2FA API (https://authkey.io/2fa-api-docs): Authkey generates the OTP, texts it using
 * your approved template (which must contain {#2fa#}), and verifies it.
 *   send:   GET https://api.authkey.io/request?authkey=…&mobile=…&country_code=91&sid=…   → { LogID, Message }
 *   verify: GET https://console.authkey.io/api/2fa_verify.php?authkey=…&channel=SMS&otp=…&logid=…  → { status: true, message: "Valid OTP" }
 * The key travels in the query string (Authkey's design), so these URLs must never be logged.
 */

const KEY = () => process.env.AUTHKEY_API_KEY?.trim() ?? "";
const SID = () => process.env.AUTHKEY_OTP_SID?.trim() ?? "";
// Overridable for automated tests against a local mock only. Leave unset in real deployments.
const SEND_BASE = () => process.env.AUTHKEY_SEND_BASE_URL || "https://api.authkey.io";
const VERIFY_BASE = () => process.env.AUTHKEY_VERIFY_BASE_URL || "https://console.authkey.io";

export const authkeyConfigured = () => Boolean(KEY() && SID());

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { ok: res.ok, status: res.status, json: { raw: text.slice(0, 200) } as Record<string, unknown> };
  }
}

/** Sends an OTP SMS to an Indian number (E.164 +91…). Returns Authkey's LogID for verification. */
export async function authkeySendOtp(phoneE164: string): Promise<string> {
  const mobile = phoneE164.replace(/^\+91/, "");
  const params = new URLSearchParams({ authkey: KEY(), mobile, country_code: "91", sid: SID() });
  try {
    const { ok, status, json } = await getJson(`${SEND_BASE()}/request?${params}`);
    const logId = json.LogID ?? json.logid ?? json.LogId;
    if (!ok || typeof logId !== "string" || !logId) {
      // Log Authkey's message (never the URL: it contains the key).
      console.error(`[authkey] send failed (${status}):`, json.Message ?? json.message ?? json.raw ?? json);
      throw new HttpError(502, "We couldn't send the OTP right now. Please try again in a minute.");
    }
    return logId;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("[authkey] send error:", (err as Error).name);
    throw new HttpError(502, "We couldn't send the OTP right now. Please try again in a minute.");
  }
}

/** True only when Authkey confirms the code for this LogID. */
export async function authkeyVerifyOtp(logId: string, otp: string): Promise<boolean> {
  const params = new URLSearchParams({ authkey: KEY(), channel: "SMS", otp, logid: logId });
  try {
    const { json } = await getJson(`${VERIFY_BASE()}/api/2fa_verify.php?${params}`);
    return json.status === true || json.status === "true" || json.status === 1;
  } catch (err) {
    console.error("[authkey] verify error:", (err as Error).name);
    throw new HttpError(502, "We couldn't check the OTP right now. Please try again.");
  }
}
