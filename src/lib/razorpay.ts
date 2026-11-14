import "server-only";
import crypto from "crypto";

const keyId = () => process.env.RAZORPAY_KEY_ID?.trim() || "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim() || "";

/** Live/test Razorpay is used only when both keys are configured; otherwise demo mode. */
export const razorpayEnabled = () => Boolean(keyId() && keySecret());
export const razorpayKeyId = keyId;

/**
 * Demo (fake) payments: only when Razorpay is not configured, and never in production
 * unless explicitly allowed — otherwise anyone could place orders without paying.
 */
export const demoPaymentsAllowed = () =>
  !razorpayEnabled() && (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true");

/**
 * How checkout takes payment right now:
 *  - "razorpay": real (or Razorpay test-mode) checkout
 *  - "demo":     simulated payments (no keys; allowed in dev, or in production with ALLOW_DEMO_PAYMENTS=true)
 *  - "disabled": production without keys and without the demo opt-in → checkout is closed
 */
export type PaymentMode = "razorpay" | "demo" | "disabled";
export const paymentMode = (): PaymentMode => (razorpayEnabled() ? "razorpay" : demoPaymentsAllowed() ? "demo" : "disabled");

/** Verify a Razorpay webhook body against X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createRazorpayOrder(amountRupees: number, receipt: string) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
    },
    body: JSON.stringify({ amount: amountRupees * 100, currency: "INR", receipt }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("Razorpay order error", res.status, await res.text());
    throw new Error("Could not start payment with Razorpay.");
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}

/** Refund (part of) a captured payment. https://razorpay.com/docs/api/refunds/create-normal/ */
export async function refundRazorpayPayment(paymentId: string, amountRupees: number, notes: Record<string, string>) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
    },
    body: JSON.stringify({ amount: amountRupees * 100, speed: "normal", notes }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; status?: string; error?: { description?: string } };
  if (!res.ok || !body.id) throw new Error(body.error?.description || `Razorpay refund failed (${res.status})`);
  return { id: body.id, status: body.status ?? "pending" };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac("sha256", keySecret()).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
