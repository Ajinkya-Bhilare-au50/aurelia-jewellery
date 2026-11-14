import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getUser } from "@/lib/auth";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Aurelia" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/account");
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr] lg:gap-12 lg:py-12">
      <AdminNav id={user.id} name={user.name} avatarUrl={user.avatarUrl} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
