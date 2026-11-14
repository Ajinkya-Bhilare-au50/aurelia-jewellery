import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/account");
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      footer={
        process.env.NODE_ENV !== "production" && <div className="mt-10 border border-dashed border-border p-4 text-[13px] text-secondary">
          <p className="font-medium text-secondary">Demo accounts</p>
          <p className="mt-1">Customer: ajinkya@aurelia.test / Ajinkya@123</p>
          <p>Admin: admin@aurelia.test / Admin@123</p>
          <p className="mt-1">Mobile OTP (customer): 98765 43210</p>
        </div>
      }
    >
      <Suspense><AuthForm mode="login" /></Suspense>
    </AuthShell>
  );
}
