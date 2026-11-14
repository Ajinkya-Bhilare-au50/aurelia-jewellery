// Masking of customer personal data for the read-only demo admin. Applied on the server, so the
// real values never reach the browser.
import type { Order } from "./types";

const dots = (n: number) => "•".repeat(Math.max(2, Math.min(n, 6)));

/** "Pranit Tupe" → "P••••• T•••" */
export const maskName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0] + dots(w.length - 1) : w))
    .join(" ");

/** "pranit@gmail.com" → "p•••••@g••••.com" */
export function maskEmail(email: string) {
  const [user, domain = ""] = email.split("@");
  const [host, ...tld] = domain.split(".");
  return `${user[0] ?? ""}${dots(user.length - 1)}@${host ? host[0] + dots(host.length - 1) : ""}${tld.length ? "." + tld.join(".") : ""}`;
}

/** "9876543210" / "+919876543210" → "••••••3210" */
export const maskPhone = (phone: string) => dots(6) + phone.replace(/\D/g, "").slice(-4);

/** Order with the customer's name, email, phone and street address masked (city/state kept). */
export function maskOrder<T extends Order>(o: T): T {
  return {
    ...o,
    email: maskEmail(o.email),
    address: {
      ...o.address,
      name: maskName(o.address.name),
      phone: maskPhone(o.address.phone),
      line1: "•••• (hidden in demo)",
      line2: o.address.line2 ? "••••" : undefined,
      pincode: o.address.pincode.slice(0, 1) + "•••••",
    },
    payment: { ...o.payment, paymentId: o.payment.paymentId ? "••••••" : undefined, razorpayOrderId: o.payment.razorpayOrderId ? "••••••" : undefined },
  };
}
