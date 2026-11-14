import Link from "next/link";
import { BusinessDetails, LegalPage, Section } from "@/components/LegalPage";
import { FREE_SHIPPING_MIN, SHIPPING_FEE } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata = { title: "Shipping policy" };

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping policy" path="/shipping-policy">
      <Section title="Where we deliver">
        <p>We ship across India to all serviceable PIN codes. You can check your PIN code on any product page. We do not currently ship internationally.</p>
      </Section>
      <Section title="Charges">
        <p>Shipping is free on orders of {formatINR(FREE_SHIPPING_MIN)} and above. A flat fee of {formatINR(SHIPPING_FEE)} applies to smaller orders. The exact amount is shown at checkout before you pay.</p>
      </Section>
      <Section title="Dispatch and delivery times">
        <p>In-stock pieces are dispatched within {SITE.dispatchDays} after payment is confirmed. Delivery usually takes 2–4 business days to metro cities and 4–7 business days elsewhere. Made-to-order or resized pieces take longer; we&apos;ll confirm the timeline with you.</p>
      </Section>
      <Section title="Insured, secure delivery">
        <p>Every order is fully insured until it reaches you and is shipped in tamper-evident packaging. A signature (and sometimes an OTP) is required on delivery. Please do not accept a parcel that appears opened or damaged — refuse it and contact us.</p>
      </Section>
      <Section title="Tracking">
        <p>Once your order ships we email you the courier name and tracking (AWB) number. You can follow every step on our <Link href="/track" className="link text-ivory">order tracking page</Link> or in your account.</p>
      </Section>
      <Section title="Delays and failed delivery">
        <p>Occasional delays can occur due to weather, holidays or courier issues; we will keep you informed. If delivery fails after three attempts the parcel is returned to us and we will contact you to re-ship or refund.</p>
      </Section>
      <Section title="Contact">
        <BusinessDetails />
      </Section>
    </LegalPage>
  );
}
