import Link from "next/link";
import { BusinessDetails, LegalPage, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & conditions" path="/terms">
      <p>These terms govern your use of this website and any purchase you make from {SITE.legalName} (&ldquo;Aurelia&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the site or placing an order you agree to them.</p>
      <Section title="Eligibility and accounts">
        <p>You must be at least 18 years old to buy from us. You are responsible for keeping your account, password and the mobile number used for OTP sign-in secure, and for all activity under your account. Tell us immediately if you suspect unauthorised use.</p>
      </Section>
      <Section title="Products and pricing">
        <p>All prices are in Indian Rupees and include applicable GST. Gold, diamond and gemstone weights are approximate and may vary slightly between handcrafted pieces; every piece is BIS hallmarked where applicable. Product images are representative; minor variation in colour and finish is natural.</p>
        <p>We may correct pricing or listing errors. If an error affects an order you have placed, we will contact you and you may cancel for a full refund.</p>
      </Section>
      <Section title="Orders and payment">
        <p>An order is confirmed only after payment is successfully received through our payment partner Razorpay (UPI, cards, net banking, wallets). We do not store your card details. We may decline or cancel an order for stock unavailability, suspected fraud, or errors, in which case any amount paid is refunded in full.</p>
      </Section>
      <Section title="Coupons and referrals">
        <p>Coupons and referral rewards are subject to their stated conditions, cannot be exchanged for cash, and only one discount applies per order. We may withdraw offers or void rewards obtained through misuse.</p>
      </Section>
      <Section title="Shipping, returns and refunds">
        <p>Delivery is covered by our <Link href="/shipping-policy" className="link text-ivory">Shipping policy</Link>; returns, cancellations and refunds by our <Link href="/refund-policy" className="link text-ivory">Returns &amp; refunds policy</Link>.</p>
      </Section>
      <Section title="Intellectual property">
        <p>All designs, photographs, text and logos on this site belong to {SITE.legalName} or its licensors and may not be copied or used without written permission.</p>
      </Section>
      <Section title="Limitation of liability">
        <p>To the extent permitted by law, our liability for any order is limited to the amount paid for that order. Nothing in these terms limits your rights under the Consumer Protection Act, 2019.</p>
      </Section>
      <Section title="Governing law">
        <p>These terms are governed by the laws of India. Courts at {SITE.jurisdiction} have exclusive jurisdiction.</p>
      </Section>
      <Section title="Contact and grievances">
        {SITE.grievanceOfficer && <p>Grievance officer: {SITE.grievanceOfficer}. We acknowledge complaints within 48 hours and resolve them within one month.</p>}
        <BusinessDetails />
      </Section>
    </LegalPage>
  );
}
