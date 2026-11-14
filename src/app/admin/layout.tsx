import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getUser } from "@/lib/auth";
import { InfoIcon } from "@/components/Icons";
import { canViewAdmin, isDemoAdmin } from "@/lib/roles";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Aurelia" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  if (!canViewAdmin(user.role)) redirect("/account");
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr] lg:gap-12 lg:py-12">
      <AdminNav id={user.id} name={user.name} avatarUrl={user.avatarUrl} />
      <div className="min-w-0">
        {isDemoAdmin(user.role) && (
          <p role="note" className="mb-6 flex items-start gap-3 border border-gold/50 bg-gold/5 px-4 py-3 text-sm">
            <InfoIcon size={18} className="mt-0.5 shrink-0 text-gold" />
            <span>
              <strong className="font-medium">Read-only demo admin.</strong> Explore everything; saving, cancelling, refunds and other changes are disabled, and customer details are masked.
            </span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
