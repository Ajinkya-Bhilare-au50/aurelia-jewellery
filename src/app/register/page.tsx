import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { DemoPhones } from "@/components/DemoPhones";
import { getUser } from "@/lib/auth";
import { isDemoSite } from "@/lib/demo";
import { authkeyEnabled } from "@/lib/phone";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/account");
  return (
    <AuthShell eyebrow="Join Aurelia" title="Create your account" footer={isDemoSite() ? <DemoPhones mode="register" realSms={authkeyEnabled()} /> : undefined}>
      <Suspense><AuthForm mode="register" /></Suspense>
    </AuthShell>
  );
}
