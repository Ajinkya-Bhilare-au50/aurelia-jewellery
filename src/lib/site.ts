// Business details shown in the footer, legal pages and emails.
// ⚠️ Replace every value marked TODO with your real details before going live —
// Razorpay checks these during account activation.
export const SITE = {
  name: "Aurelia Fine Jewellery",
  legalName: "Aurelia Fine Jewellery", // TODO: registered business / proprietor name
  address: ["Shop 12, Kala Ghoda, Fort", "Mumbai, Maharashtra 400001"], // TODO
  hours: "Mon to Sat, 11am to 8pm",
  email: "care@example.com", // TODO: support email
  phone: "+91 00000 00000", // TODO: support phone
  gstin: "", // TODO: GSTIN (shown on legal pages when set)
  grievanceOfficer: "", // TODO: name of grievance officer (Consumer Protection (E-Commerce) Rules, 2020)
  jurisdiction: "Mumbai, Maharashtra",
  returnDays: 15,
  dispatchDays: "2–5 business days",
  updated: "14 November 2026",
} as const;

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
