import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentMode } from "@/lib/razorpay";
import type { Address } from "@/lib/types";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  const last = await prisma.order.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { address: true } });
  const address = last?.address as Address | undefined;
  return <CheckoutForm email={user.email} defaultAddress={address ?? { name: user.name, phone: user.phone?.slice(3) }} mode={paymentMode()} />;
}
