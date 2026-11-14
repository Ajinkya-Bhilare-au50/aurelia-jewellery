import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { formatINR } from "./format";
import { SITE, siteUrl } from "./site";
import type { Order } from "./types";

/**
 * Transactional email. Two transports (first configured wins):
 *  - SMTP, e.g. Gmail: SMTP_USER + SMTP_PASS (a Gmail *app password*), optional SMTP_HOST/SMTP_PORT.
 *    Sends to any address without owning a domain (Gmail: ~500/day).
 *  - Resend REST API: RESEND_API_KEY + EMAIL_FROM (needs a verified domain to email other people).
 * EMAIL_FROM is the sender, e.g. "Aurelia <you@gmail.com>". Unconfigured → logged and skipped.
 * Never throws: returns false on failure (order emails must not break orders).
 */
const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const emailConfigured = () => smtpConfigured() || resendConfigured();

const g = globalThis as unknown as { __smtp?: Transporter };
function smtp() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return (g.__smtp ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  }));
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[email skipped: no SMTP or Resend configured] ${subject}`);
    return false;
  }
  try {
    if (smtpConfigured()) {
      const from = process.env.EMAIL_FROM || `${SITE.name} <${process.env.SMTP_USER}>`;
      await smtp().sendMail({ from, to, subject, html, replyTo: SITE.email });
      return true;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, reply_to: SITE.email }),
      cache: "no-store",
    });
    if (!res.ok) console.error("Email send failed", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error("Email send failed:", (err as Error).message);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#ffffff" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px;border-bottom:1px solid #eee;font-family:Georgia,serif;font-size:24px;letter-spacing:6px">AURELIA</td></tr>
<tr><td style="padding:32px"><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${title}</h1>${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #eee;font-size:12px;color:#777">${esc(SITE.legalName)} · ${esc(SITE.address.join(", "))}<br>Questions? Reply to this email or write to ${esc(SITE.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(o: Order) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${esc(i.name)}${i.size ? ` (size ${esc(i.size)})` : ""} × ${i.qty}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #f0f0f0">${formatINR(i.price * i.qty)}</td></tr>`)
    .join("");
  const line = (k: string, v: string, bold = false) => `<tr><td style="padding:4px 0${bold ? ";font-weight:bold" : ""}">${k}</td><td align="right" style="padding:4px 0${bold ? ";font-weight:bold" : ""}">${v}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}
${line("Subtotal", formatINR(o.subtotal))}${o.discount ? line(esc(o.discountLabel ?? "Discount"), "−" + formatINR(o.discount)) : ""}${line("Shipping", o.shipping ? formatINR(o.shipping) : "Free")}${line("Total paid", formatINR(o.total), true)}</table>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#1a1a1a;color:#fff;padding:12px 22px;text-decoration:none;font-size:13px;letter-spacing:2px">${label}</a></p>`;

export function sendOrderConfirmed(o: Order) {
  const a = o.address;
  return send(
    o.email,
    `Order ${o.number} confirmed`,
    layout(
      "Thank you for your order",
      `<p style="font-size:14px;line-height:1.6">Hi ${esc(a.name.split(" ")[0])}, we've received your payment for order <strong>${o.number}</strong>. Your piece is being prepared and will be dispatched within ${SITE.dispatchDays}.</p>
${itemsTable(o)}
<p style="font-size:13px;line-height:1.6;color:#555">Delivering to:<br>${esc(a.name)}<br>${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ""}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</p>
${button(`${siteUrl()}/account/orders/${o.id}`, "VIEW ORDER")}`,
    ),
  );
}

export function sendOrderShipped(o: Order) {
  return send(
    o.email,
    `Order ${o.number} has shipped`,
    layout(
      "Your order is on its way",
      `<p style="font-size:14px;line-height:1.6">Order <strong>${o.number}</strong> has been handed to <strong>${esc(o.courier ?? "our courier")}</strong>${o.awb ? ` with tracking number <strong>${esc(o.awb)}</strong>` : ""}. Fully insured, signature required on delivery.</p>
${button(`${siteUrl()}/track`, "TRACK ORDER")}`,
    ),
  );
}

export function sendOrderCancelled(o: Order, refundAmount: number, whole: boolean) {
  const refundLine = refundAmount
    ? `<p style="font-size:14px;line-height:1.6">A refund of <strong>${formatINR(refundAmount)}</strong> has been initiated to your original payment method. It usually reaches your account within 5–7 business days, depending on your bank.</p>`
    : "";
  const remaining = o.items.filter((i) => i.qty - (i.cancelledQty ?? 0) > 0);
  const stillComing = !whole && remaining.length
    ? `<p style="font-size:13px;line-height:1.6;color:#555">Still on its way: ${remaining.map((i) => `${i.qty - (i.cancelledQty ?? 0)} × ${esc(i.name)}`).join(", ")}.</p>`
    : "";
  return send(
    o.email,
    whole ? `Order ${o.number} cancelled` : `Item cancelled from order ${o.number}`,
    layout(
      whole ? "Your order has been cancelled" : "Your cancellation is confirmed",
      `<p style="font-size:14px;line-height:1.6">${whole ? `Order <strong>${o.number}</strong> has been cancelled.` : `We've cancelled part of order <strong>${o.number}</strong> as requested.`}</p>
${refundLine}${stillComing}
${button(`${siteUrl()}/account/orders/${o.id}`, "VIEW ORDER")}`,
    ),
  );
}

export function sendOrderDelivered(o: Order) {
  return send(
    o.email,
    `Order ${o.number} delivered`,
    layout(
      "Delivered — enjoy wearing it",
      `<p style="font-size:14px;line-height:1.6">Order <strong>${o.number}</strong> has been delivered. If anything isn't right, you can request a return within ${SITE.returnDays} days of delivery.</p>
${button(`${siteUrl()}/refund-policy`, "RETURNS POLICY")}`,
    ),
  );
}

/** One-time sign-in code (email OTP). Returns false if it could not be sent. */
export function sendLoginCode(to: string, code: string, name?: string) {
  return send(
    to,
    `${code} is your Aurelia sign-in code`,
    layout(
      "Your sign-in code",
      `<p style="font-size:14px;line-height:1.6">${name ? `Hi ${esc(name.split(" ")[0])}, use` : "Use"} this code to sign in to ${esc(SITE.name)}:</p>
<p style="font-family:Georgia,serif;font-size:34px;letter-spacing:10px;margin:24px 0">${code}</p>
<p style="font-size:13px;line-height:1.6;color:#555">It expires in 10 minutes and works once. If you didn't try to sign in, you can ignore this email: your account is safe.</p>`,
    ),
  );
}
