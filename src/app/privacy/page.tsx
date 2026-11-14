import { BusinessDetails, LegalPage, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" path="/privacy">
      <p>{SITE.legalName} respects your privacy. This policy explains what personal data we collect, why, and your rights under the Digital Personal Data Protection Act, 2023 and other applicable Indian law.</p>
      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-ivory">Account details:</strong> name, email address, mobile number and a securely hashed password.</li>
          <li><strong className="text-ivory">Order details:</strong> items purchased, delivery address and contact number, order and delivery history.</li>
          <li><strong className="text-ivory">Payment details:</strong> processed by Razorpay. We receive only a payment reference — never your card, UPI PIN or bank credentials.</li>
          <li><strong className="text-ivory">Technical data:</strong> IP address and essential cookies needed to keep you signed in and to protect against abuse.</li>
        </ul>
      </Section>
      <Section title="How we use it">
        <p>To create and secure your account (including OTP verification), process and deliver orders, send order and delivery updates, provide customer support, apply coupons and referral rewards, prevent fraud, and meet legal and tax obligations. We do not sell your personal data.</p>
      </Section>
      <Section title="Who we share it with">
        <p>Only with service providers who help us run the store, under confidentiality obligations: Razorpay (payments), Google Firebase (mobile OTP), our courier partners (delivery), our hosting and database providers, and our email provider (order notifications). We may also disclose data where required by law.</p>
      </Section>
      <Section title="Cookies">
        <p>We use a single essential, secure cookie to keep you signed in. Your bag and wishlist are stored in your own browser. We do not use advertising cookies.</p>
      </Section>
      <Section title="Retention and security">
        <p>We keep account data while your account is active and order records for as long as tax and accounting law requires. Data is encrypted in transit (HTTPS), passwords are hashed, and access is restricted to authorised staff.</p>
      </Section>
      <Section title="Your rights">
        <p>You may request access to, correction of, or deletion of your personal data, and withdraw consent for optional communications, by writing to us at the address below. We respond within 30 days.</p>
      </Section>
      <Section title="Contact">
        {SITE.grievanceOfficer && <p>Grievance officer: {SITE.grievanceOfficer}</p>}
        <BusinessDetails />
      </Section>
    </LegalPage>
  );
}
