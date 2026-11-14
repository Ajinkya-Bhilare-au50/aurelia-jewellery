import { BusinessDetails, LegalPage, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Returns & refunds" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Returns, cancellations & refunds" path="/refund-policy">
      <Section title="Cancellations">
        <p>You can cancel an order free of charge any time before it is shipped by contacting us with your order number. Once shipped, please use the returns process below.</p>
      </Section>
      <Section title={`${SITE.returnDays}-day returns`}>
        <p>If you are not completely happy, you may return most pieces within {SITE.returnDays} days of delivery for a full refund. To be eligible, the piece must be unworn and undamaged, with its original packaging, tags, certificate and invoice.</p>
        <p>The following cannot be returned unless they arrive damaged or defective: engraved or personalised pieces, items made or resized to order, and earrings (for hygiene reasons).</p>
      </Section>
      <Section title="How to return">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Email or call us within {SITE.returnDays} days of delivery with your order number and reason for return.</li>
          <li>We arrange a free, insured reverse pickup from your delivery address.</li>
          <li>Our team inspects the piece within 3 business days of receiving it.</li>
        </ol>
      </Section>
      <Section title="Refunds">
        <p>Approved refunds are issued to your original payment method within 5–7 business days of inspection. The time for the money to reach your account depends on your bank or UPI provider. Shipping charges, if any were paid, are refunded with the item for damaged, defective or incorrect deliveries.</p>
        <p>If a payment was deducted but the order was not confirmed, the amount is refunded automatically by Razorpay within 5–7 business days.</p>
      </Section>
      <Section title="Damaged or incorrect items">
        <p>Every parcel is insured. If your order arrives damaged, tampered with, or is not what you ordered, please record an unboxing video if possible and contact us within 48 hours of delivery. We will replace the piece or refund you in full.</p>
      </Section>
      <Section title="Contact">
        <BusinessDetails />
      </Section>
    </LegalPage>
  );
}
