import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDate, STATUS_LABEL } from "./format";
import { SITE, siteUrl } from "./site";
import type { Order } from "./types";

/**
 * GST invoice for an order, as a PDF (A4). Prices on the site include GST, so the tax is
 * back-calculated from the total: CGST + SGST when the buyer is in SITE.state, else IGST.
 * Uses the built-in PDF fonts (no font files to ship); they have no ₹ glyph, so amounts read "Rs.".
 */

// Invoices only exist for orders that were actually paid.
export const invoiceAvailable = (o: Order) => o.status !== "pending_payment" && Boolean(o.payment.paymentId);
export const invoiceNumber = (o: Order) => `INV-${o.number}`;

const money = (n: number) => "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 179800 → "One Lakh Seventy-Nine Thousand Eight Hundred" (Indian numbering). */
export function rupeesInWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? "-" + ones[x % 10] : ""));
  const three = (x: number) => [x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred` : "", two(x % 100)].filter(Boolean).join(" ");
  n = Math.round(n);
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), thousand = Math.floor((n % 1e5) / 1e3), rest = n % 1e3;
  if (crore) parts.push(`${crore >= 100 ? three(crore) : two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return parts.join(" ");
}

export async function buildInvoicePdf(o: Order): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoiceNumber(o)}`);
  pdf.setAuthor(SITE.legalName);
  pdf.setCreator(SITE.name);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  const W = 595.28, H = 841.89, M = 48;
  const ink = rgb(0.1, 0.1, 0.1), grey = rgb(0.42, 0.42, 0.42), line = rgb(0.85, 0.85, 0.85), gold = rgb(0.62, 0.48, 0.24), red = rgb(0.7, 0.15, 0.15);
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  // Built-in fonts only cover Latin-1: replace anything else (e.g. Devanagari names) instead of crashing.
  const okChar = new Map<string, boolean>();
  const safe = (s: string, f: PDFFont) =>
    [...s].map((c) => {
      if (!okChar.has(c)) {
        try { f.encodeText(c); okChar.set(c, true); } catch { okChar.set(c, false); }
      }
      return okChar.get(c) ? c : "?";
    }).join("");
  const text = (s: string, x: number, yy: number, o2: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right"; spacing?: number } = {}) => {
    const f = o2.font ?? sans, size = o2.size ?? 9.5, str = safe(s, f);
    let w = f.widthOfTextAtSize(str, size);
    if (o2.spacing) w += o2.spacing * (str.length - 1);
    const x0 = o2.align === "right" ? x - w : x;
    if (o2.spacing) {
      let cx = x0;
      for (const ch of str) { page.drawText(ch, { x: cx, y: yy, size, font: f, color: o2.color ?? ink }); cx += f.widthOfTextAtSize(ch, size) + o2.spacing; }
    } else page.drawText(str, { x: x0, y: yy, size, font: f, color: o2.color ?? ink });
  };
  const wrap = (s: string, width: number, f: PDFFont, size: number) => {
    const words = safe(s, f).split(/\s+/), out: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) <= width) cur = next;
      else { if (cur) out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out;
  };
  const rule = (yy: number, x1 = M, x2 = W - M, color = line, thickness = 0.7) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color });
  const ensure = (need: number) => {
    if (y - need < M + 40) { page = pdf.addPage([W, H]); y = H - M; }
  };

  // ---- Header
  text("AURELIA", M, y - 18, { font: serif, size: 26, spacing: 5 });
  text("FINE JEWELLERY", M + 1, y - 34, { size: 7.5, color: gold, spacing: 2.2 });
  text(SITE.gstin ? "TAX INVOICE" : "INVOICE", W - M, y - 14, { font: bold, size: 15, align: "right", spacing: 1 });
  const paidAt = o.timeline.find((t) => t.status === "confirmed")?.at ?? o.createdAt;
  const meta: [string, string][] = [["Invoice no.", invoiceNumber(o)], ["Invoice date", formatDate(paidAt)], ["Order no.", o.number], ["Order date", formatDate(o.createdAt)]];
  meta.forEach(([k, v], i) => {
    text(k, W - M - 120, y - 32 - i * 13, { size: 8.5, color: grey });
    text(v, W - M, y - 32 - i * 13, { size: 8.5, font: bold, align: "right" });
  });
  y -= 92;
  rule(y);
  y -= 18;

  // ---- Seller / buyer
  const col2 = M + (W - 2 * M) / 2 + 10;
  const seller = [SITE.legalName, ...SITE.address, SITE.gstin ? `GSTIN: ${SITE.gstin}` : "", `${SITE.email} · ${siteUrl().replace(/^https?:\/\//, "")}`].filter(Boolean);
  const a = o.address;
  const buyer = [a.name, a.line1, a.line2 ?? "", `${a.city}, ${a.state} ${a.pincode}`, `+91 ${a.phone}`, o.email].filter(Boolean);
  text("SOLD BY", M, y, { size: 7.5, color: grey, spacing: 1.2 });
  text("BILL TO / SHIP TO", col2, y, { size: 7.5, color: grey, spacing: 1.2 });
  y -= 14;
  const rows = Math.max(seller.length, buyer.length);
  for (let i = 0; i < rows; i++) {
    if (seller[i]) text(seller[i], M, y - i * 12.5, { font: i === 0 ? bold : sans, size: 9 });
    if (buyer[i]) text(buyer[i], col2, y - i * 12.5, { font: i === 0 ? bold : sans, size: 9 });
  }
  y -= rows * 12.5 + 4;
  const intra = a.state.trim().toLowerCase() === SITE.state.toLowerCase();
  text(`Place of supply: ${a.state}${intra ? "" : " (inter-state)"}`, col2, y, { size: 8.5, color: grey });
  y -= 22;

  // ---- Items table
  // right edges for numbers; money columns get ~110pt each so lakh amounts never collide
  const cx = { n: M + 6, item: M + 26, hsn: M + 245, qty: M + 300, rate: M + 400, amt: W - M - 6 };
  const head = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: rgb(0.95, 0.94, 0.92) });
    text("#", cx.n, y, { size: 8, font: bold });
    text("ITEM", cx.item, y, { size: 8, font: bold, spacing: 0.8 });
    text("HSN", cx.hsn, y, { size: 8, font: bold });
    text("QTY", cx.qty, y, { size: 8, font: bold, align: "right" });
    text("UNIT PRICE", cx.rate, y, { size: 8, font: bold, align: "right" });
    text("AMOUNT", cx.amt, y, { size: 8, font: bold, align: "right" });
    y -= 22;
  };
  head();
  o.items.forEach((it, i) => {
    const sub = [it.size ? `Size ${it.size}` : "", it.saleName && it.listPrice ? `${it.saleName}: was ${money(it.listPrice)}` : "", it.cancelledQty ? `${it.cancelledQty} cancelled and refunded` : ""].filter(Boolean).join(" · ");
    const nameLines = wrap(it.name, cx.hsn - cx.item - 12, sans, 9.5);
    const need = nameLines.length * 12 + (sub ? 11 : 0) + 12;
    if (y - need < M + 60) { page = pdf.addPage([W, H]); y = H - M; head(); }
    text(String(i + 1), cx.n, y, { size: 9 });
    nameLines.forEach((l, j) => text(l, cx.item, y - j * 12, { size: 9.5 }));
    text(SITE.hsn, cx.hsn, y, { size: 9 });
    text(String(it.qty), cx.qty, y, { size: 9.5, align: "right" });
    text(money(it.price), cx.rate, y, { size: 9.5, align: "right" });
    text(money(it.price * it.qty), cx.amt, y, { size: 9.5, align: "right" });
    let yy = y - nameLines.length * 12;
    if (sub) { text(sub, cx.item, yy + 1, { size: 7.5, color: it.cancelledQty ? red : grey }); yy -= 11; }
    y = yy - 6;
    rule(y + 6);
  });
  y -= 10;

  // ---- Totals (right) + GST breakdown (left)
  ensure(170);
  const rate = SITE.gstRatePct / 100;
  const taxable = o.total / (1 + rate);
  const gst = o.total - taxable;
  const lx = W - M - 230, rx = W - M;
  const totals: [string, string, { bold?: boolean; color?: ReturnType<typeof rgb> }?][] = [
    ["Subtotal", money(o.subtotal)],
    ...(o.discount ? [[o.discountLabel ?? "Discount", "- " + money(o.discount)] as [string, string]] : []),
    ["Shipping", o.shipping ? money(o.shipping) : "Free"],
  ];
  const topY = y;
  totals.forEach(([k, v]) => { text(k, lx, y, { size: 9.5, color: grey }); text(v, rx, y, { size: 9.5, align: "right" }); y -= 15; });
  rule(y + 9, lx, rx);
  y -= 6;
  text("Total (incl. GST)", lx, y, { size: 11, font: bold });
  text(money(o.total), rx, y, { size: 11, font: bold, align: "right" });
  y -= 16;
  if (o.refundedAmount > 0) {
    text("Refunded", lx, y, { size: 9.5, color: red });
    text("- " + money(o.refundedAmount), rx, y, { size: 9.5, align: "right", color: red });
    y -= 15;
    text("Net paid", lx, y, { size: 10, font: bold });
    text(money(o.total - o.refundedAmount), rx, y, { size: 10, font: bold, align: "right" });
    y -= 15;
  }
  const rightBottom = y;

  // GST box (left column, aligned with the totals)
  let gy = topY;
  const gx = M, gw = 230;
  text("GST SUMMARY", gx, gy, { size: 7.5, color: grey, spacing: 1.2 });
  gy -= 15;
  const gstRows: [string, string][] = [["Taxable value", money(taxable)], ...(intra
    ? ([[`CGST @ ${SITE.gstRatePct / 2}%`, money(gst / 2)], [`SGST @ ${SITE.gstRatePct / 2}%`, money(gst / 2)]] as [string, string][])
    : ([[`IGST @ ${SITE.gstRatePct}%`, money(gst)]] as [string, string][])), ["Total GST", money(gst)]];
  gstRows.forEach(([k, v], i) => {
    const last = i === gstRows.length - 1;
    text(k, gx, gy, { size: 9, color: last ? ink : grey, font: last ? bold : sans });
    text(v, gx + gw, gy, { size: 9, align: "right", font: last ? bold : sans });
    gy -= 14;
  });
  y = Math.min(rightBottom, gy) - 12;

  // Amount in words
  rule(y + 6);
  y -= 10;
  text("Amount in words", M, y, { size: 7.5, color: grey, spacing: 1 });
  y -= 13;
  for (const l of wrap(`Rupees ${rupeesInWords(o.total)} Only`, W - 2 * M, bold, 9.5)) { text(l, M, y, { size: 9.5, font: bold }); y -= 12; }

  // Payment + status
  y -= 8;
  const method = o.payment.provider === "razorpay" ? "Razorpay" : "Demo payment (portfolio store, no money charged)";
  text(`Payment: ${method}${o.payment.paymentId ? ` · Ref ${o.payment.paymentId}` : ""}`, M, y, { size: 8.5, color: grey });
  y -= 12;
  if (o.status === "cancelled") { text(`Order status: ${STATUS_LABEL[o.status]}. Refunds are listed above.`, M, y, { size: 8.5, color: red, font: bold }); y -= 12; }

  // ---- Footer (every page)
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    rule(M + 26);
    text(`Prices include ${SITE.gstRatePct}% GST. BIS hallmarked. This is a computer-generated invoice and needs no signature.`, M, M + 13, { size: 7.5, color: grey });
    text(`${SITE.name} · ${SITE.email}`, M, M + 2, { size: 7.5, color: grey });
    text(`Page ${i + 1} of ${pages.length}`, W - M, M + 2, { size: 7.5, color: grey, align: "right" });
  });

  return pdf.save();
}
