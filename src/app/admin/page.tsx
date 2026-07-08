import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import AdminLogin from "@/components/admin/AdminLogin";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/dashboard");

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <Logo size={28} className="mb-8 justify-center" />
        <div className="rounded-2xl border border-line bg-white p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Review candidates, score simulations, and invite new applicants.
          </p>
          <div className="mt-6">
            <AdminLogin />
          </div>
        </div>
      </div>
    </main>
  );
}
