import Link from "next/link";
import { BusinessDetails, LegalPage, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact us" path="/contact">
      <p>We&apos;d love to help — whether it&apos;s choosing a piece, sizing, an order, or a return.</p>
      <Section title="Customer care">
        <BusinessDetails />
        <p>Hours: {SITE.hours} (closed on public holidays). We reply to emails within one business day.</p>
      </Section>
      <Section title="Visit the boutique">
        <p>{SITE.address.join(", ")}. Appointments are recommended for bridal and bespoke consultations.</p>
      </Section>
      <Section title="About an order?">
        <p>Please include your order number (e.g. AUR-10231). You can also <Link href="/track" className="link text-ivory">track your order</Link> anytime.</p>
      </Section>
      {SITE.grievanceOfficer && (
        <Section title="Grievance officer">
          <p>{SITE.grievanceOfficer} — {SITE.email}. Complaints are acknowledged within 48 hours and resolved within one month.</p>
        </Section>
      )}
    </LegalPage>
  );
}
