import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { DemoPhones } from "@/components/DemoPhones";
import { getUser } from "@/lib/auth";
import { isDemoSite } from "@/lib/demo";
import { emailOtpAvailable } from "@/lib/emailOtp";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/account");
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      footer={
        <>
          {/* Demo deployment: public test numbers (never on a real shop). */}
          {isDemoSite() && <DemoPhones mode="login" />}
          {/* Local development only: seeded email logins incl. the admin. Never shown on a deployed site. */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-4 border border-dashed border-border p-4 text-[13px] text-secondary">
              <p className="font-medium text-secondary">Local demo accounts (dev only)</p>
              <p className="mt-1">Customer: ajinkya@aurelia.test / Ajinkya@123</p>
              <p>Admin: admin@aurelia.test / Admin@123</p>
            </div>
          )}
        </>
      }
    >
      <Suspense><AuthForm mode="login" emailOtp={emailOtpAvailable()} /></Suspense>
    </AuthShell>
  );
}
