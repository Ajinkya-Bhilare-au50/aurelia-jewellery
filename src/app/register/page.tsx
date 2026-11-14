import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/account");
  return (
    <AuthShell eyebrow="Join Aurelia" title="Create your account">
      <Suspense><AuthForm mode="register" /></Suspense>
    </AuthShell>
  );
}
