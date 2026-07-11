import AdminShell from "@/components/admin/AdminShell";
import { requirePlatformRole } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";

export default async function AdminOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformRole([
    "super_admin",
    "admin",
    "operator",
    "reviewer",
    "support",
  ]);

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
