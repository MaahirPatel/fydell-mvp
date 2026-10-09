import AdminShell from "@/components/admin/AdminShell";
import { requirePlatformRole } from "@/lib/ops/require-platform-role";
import { ADMIN_SHELL_ROLES } from "@/lib/ops/admin-permissions";

export const dynamic = "force-dynamic";

export default async function AdminOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformRole(ADMIN_SHELL_ROLES);

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
