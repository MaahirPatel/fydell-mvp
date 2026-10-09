import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import ApplyForm from "@/components/hiring/ApplyForm";
import { requireUser } from "@/lib/simulations/auth";
import { getPublicRole } from "@/lib/hiring/roles";
import { getOwnerPassport } from "@/lib/passport/store";
import { listEvidenceOptions } from "@/lib/profile-evidence/store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { withNext } from "@/lib/auth/safe-next";

export const metadata = { title: "Apply", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const role = await getPublicRole(slug, user?.id ?? null);
  if (!role) notFound();
  if (!user) redirect(withNext("/signup", `/jobs/${slug}/apply`));

  const db = createAdminSupabaseClient();
  const { data: existing } = await db
    .from("role_applications")
    .select("id")
    .eq("role_id", role.id)
    .eq("applicant_user_id", user.id)
    .eq("status", "submitted")
    .maybeSingle();
  if (existing) redirect(`/app/candidate/applications/${(existing as { id: string }).id}?already=1`);

  const [passport, options, profile] = await Promise.all([
    getOwnerPassport(user.id),
    listEvidenceOptions(user.id),
    db.from("profiles").select("full_name,display_name").eq("id", user.id).maybeSingle(),
  ]);
  // A person who has just signed up from this link has no Passport yet, but gave their name on the way here.
  const profileRow = profile.data as { full_name: string | null; display_name: string | null } | null;
  const defaultName = (passport?.displayName || profileRow?.display_name || profileRow?.full_name || "").trim();
  const projects = options.map((o) => ({ key: o.key, title: o.title, kind: o.kind, detail: o.detail, private: o.private, confirmed: o.confirmed }));

  return (
    <MarketingShell>
      <div className="mx-auto max-w-[680px] px-6 pb-24 pt-32 md:pt-36">
        <p className="text-[14px] text-[var(--text-secondary)]">
          <Link href={`/jobs/${slug}`} className="underline-offset-4 hover:underline">{role.title}</Link> · {role.organizationName}
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.25rem)] font-normal leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">Apply</h1>
        {role.accepting ? (
          <div className="mt-8">
            <ApplyForm slug={slug} email={user.email} defaultName={defaultName} organizationName={role.organizationName} projects={projects} />
          </div>
        ) : (
          <p role="status" className="mt-8 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-[15px] text-[var(--text-body)]">
            {role.closedReason}
          </p>
        )}
      </div>
    </MarketingShell>
  );
}
