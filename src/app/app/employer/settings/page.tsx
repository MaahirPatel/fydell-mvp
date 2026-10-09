import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import SignOutButton from "@/components/employer/SignOutButton";
import WorkspaceNameForm from "@/components/employer/WorkspaceNameForm";
import { ContactLink } from "@/components/ui/ContactLink";
import { memberIdentity, type AuthIdentityMetadata } from "@/lib/workspace/identity";
import { isPreviewMode, PREVIEW_ORG, PREVIEW_USER } from "@/lib/dev/preview";
import PlanControls from "@/components/employer/PlanControls";
import { billingConfig } from "@/lib/billing/stripe";
import { getBilling, getMembership, type OrganizationBilling } from "@/lib/billing/db";
import { cn } from "@/lib/cn";
import DeleteAccount from "@/components/account/DeleteAccount";
import WorkspaceDeletionRequest from "@/components/account/WorkspaceDeletionRequest";
import { openWorkspaceDeletion } from "@/lib/account/workspace-deletion";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const MANAGER_ROLES = new Set(["owner", "admin"]);

const SECTIONS = [
  { key: "general", label: "General" },
  { key: "account", label: "Account" },
  { key: "members", label: "Members" },
  { key: "candidates", label: "Candidate experience" },
  { key: "privacy", label: "Data & privacy" },
  { key: "plan", label: "Plan & billing" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment overdue",
  unpaid: "Unpaid",
  canceled: "Cancelled",
  incomplete: "Awaiting payment",
  incomplete_expired: "Checkout expired",
  paused: "Paused",
};

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-7">
      <h1 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-1.5 text-[14px] leading-[1.5] text-[var(--text-secondary)]">{description}</p>
    </header>
  );
}

/** A labelled stack of rows. The label sits outside the card, as a quiet heading. */
function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      {label ? <h2 className="mb-2 px-1 text-[12.5px] font-medium text-[var(--text-tertiary)]">{label}</h2> : null}
      <div className="overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">{children}</div>
    </section>
  );
}

/** Label and description on the left, the value or control on the right. */
function Row({ label, help, children, stack = false }: { label: string; help?: string; children?: React.ReactNode; stack?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-x-6 gap-y-2 border-b border-[var(--border-subtle)] px-4 py-3.5 last:border-b-0",
        stack ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="min-w-0 sm:max-w-[52%]">
        <p className="text-[14px] font-medium text-[var(--text-primary)]">{label}</p>
        {help ? <p className="mt-0.5 text-[13px] leading-[1.45] text-[var(--text-tertiary)]">{help}</p> : null}
      </div>
      {children ? <div className={cn("min-w-0", stack ? "" : "sm:text-right")}>{children}</div> : null}
    </div>
  );
}

function Value({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <p className={cn("text-[14px] leading-[1.5]", muted ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]")}>{children}</p>;
}

function StatusDot({ tone, children }: { tone: "ok" | "attention"; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] text-[var(--text-primary)]">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tone === "ok" ? "var(--status-positive-ink)" : "var(--fydell-changed)" }} />
      {children}
    </span>
  );
}

const linkClass = "inline-flex min-h-8 items-center text-[14px] font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-[3px] hover:decoration-[var(--text-primary)]";

export default async function EmployerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; plan?: string; section?: string }>;
}) {
  const params = await searchParams;
  const section: SectionKey = SECTIONS.some((s) => s.key === params.section)
    ? (params.section as SectionKey)
    : params.billing || params.plan
      ? "plan"
      : "general";
  const preview = isPreviewMode();
  const user = preview ? PREVIEW_USER : await getAuthenticatedUser();

  let workspaceName = preview ? PREVIEW_ORG.organizationName : "Your workspace";
  let memberRole = preview ? "owner" : "member";
  let memberCount: number | null = null;
  let soleOwner = false;
  let deletionRequestedAt: string | null = null;
  let identity = memberIdentity(
    user?.email || "",
    preview ? { full_name: PREVIEW_USER.fullName, avatar_url: PREVIEW_USER.avatarUrl } : null,
    preview ? null : (user as { user_metadata?: AuthIdentityMetadata } | null)?.user_metadata,
  );
  if (!preview && user && isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("role, organization_id, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    workspaceName = (membership?.organizations as { name?: string } | null)?.name || workspaceName;
    memberRole = membership?.role || memberRole;
    if (membership?.organization_id) {
      const { count } = await admin
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("status", "active");
      memberCount = count ?? null;
      if (membership.role === "owner") {
        const { count: owners } = await admin
          .from("organization_members")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", membership.organization_id)
          .eq("role", "owner")
          .eq("status", "active");
        soleOwner = (owners ?? 0) <= 1;
        if (section === "privacy") deletionRequestedAt = (await openWorkspaceDeletion(membership.organization_id))?.receivedAt ?? null;
      }
    }
    const { data: profile } = await admin.from("profiles").select("full_name, display_name, avatar_url").eq("id", user.id).maybeSingle();
    identity = memberIdentity(user.email || "", profile, (user as { user_metadata?: AuthIdentityMetadata }).user_metadata);
  }

  const canEdit = MANAGER_ROLES.has(memberRole);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);

  const billingReady = billingConfig() !== null && !preview;
  let billing: OrganizationBilling | null = null;
  if (section === "plan" && billingReady && user && isSupabaseConfigured()) {
    const membership = await getMembership(user.id);
    if (membership) billing = await getBilling(membership.organizationId);
  }
  const hasSubscription = Boolean(billing?.stripeSubscriptionId && billing.status && billing.status !== "canceled" && billing.status !== "incomplete_expired");
  const planLabel =
    hasSubscription && billing
      ? `${billing.plan === "team" ? "Team" : billing.plan === "starter" ? "Starter" : "Custom"} · ${STATUS_LABEL[billing.status ?? ""] ?? billing.status}`
      : "No plan yet";
  const suggestedPlan = params.plan === "starter" || params.plan === "team" ? params.plan : null;
  const billingNotice =
    params.billing === "success"
      ? hasSubscription
        ? "Payment set up. Your plan is active."
        : "Payment received. Stripe is confirming it, so refresh in a few seconds."
      : params.billing === "cancelled"
        ? "Checkout cancelled. Nothing was charged."
        : null;

  return (
    <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[208px_minmax(0,720px)]">
      <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-8 lg:h-fit">
        <p className="mb-3 hidden px-2.5 text-[13px] font-medium text-[var(--text-tertiary)] lg:block">Settings</p>
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {SECTIONS.map((s) => {
            const active = s.key === section;
            return (
              <li key={s.key}>
                <Link
                  href={`/app/employer/settings?section=${s.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap rounded-[7px] px-2.5 py-1.5 text-[14px] transition-colors duration-[var(--motion-fast)]",
                    active
                      ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        {section === "general" ? (
          <>
            <SectionTitle title="General" description="How this workspace appears to your team and to candidates." />
            <Group label="Workspace">
              <Row label="Name" help="Shown on invitations, the candidate's brief and reports." stack>
                <WorkspaceNameForm initialName={workspaceName} canEdit={canEdit} />
              </Row>
              <Row label="Company logo" help="Shown on candidate invitations and reviewed evidence.">
                <Value muted>
                  Managed by Fydell · <ContactLink />
                </Value>
              </Row>
            </Group>
            <Group label="Your access">
              <Row label="Role" help="Owners and admins can rename the workspace, publish simulations and manage billing.">
                <Value>
                  <span className="capitalize">{memberRole}</span>
                </Value>
              </Row>
            </Group>
          </>
        ) : null}

        {section === "account" ? (
          <>
            <SectionTitle title="Account" description="Your own sign-in. It is separate from the workspace." />
            <Group label="Profile">
              <Row label="Signed in as" help="Taken from what you entered when you created this account.">
                <div className="flex items-center gap-3 sm:justify-end">
                  {identity.avatarUrl ? (
                    <Image
                      src={identity.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 shrink-0 rounded-full border border-[var(--border-default)] object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-[12px] font-semibold text-[var(--text-primary)]"
                    >
                      {identity.initials}
                    </span>
                  )}
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[14px] font-medium text-[var(--text-primary)]">{identity.name || "No name on record"}</p>
                    <p className="truncate text-[13px] text-[var(--text-secondary)]">{identity.email || "Not signed in"}</p>
                  </div>
                </div>
              </Row>
              <Row label="Photo" help="Supplied by your sign-in provider, if it has one.">
                <Value muted>{identity.avatarUrl ? "From your sign-in provider" : "Initials shown"}</Value>
              </Row>
            </Group>
            <Group label="Session">
              <Row label="Sign out" help="Ends this session on this device only.">
                <SignOutButton className="inline-flex h-8 items-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[13.5px] font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] disabled:opacity-50" />
              </Row>
            </Group>
            {preview ? null : (
              <Group label="Delete account">
                {soleOwner ? (
                  <Row
                    label="Delete your account"
                    help={`You're the only owner of ${workspaceName}. Make a teammate an owner on the Team page first, or request deletion of the whole workspace.`}
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
                      <Link href="/app/employer/team" className={linkClass}>
                        Open Team
                      </Link>
                      <Link href="/app/employer/settings?section=privacy" className={linkClass}>
                        Data & privacy
                      </Link>
                    </div>
                  </Row>
                ) : (
                  <Row label="Delete your account" help="Permanent. You can sign up again later with the same email." stack>
                    <DeleteAccount kind="employer" workspaceName={workspaceName} />
                  </Row>
                )}
              </Group>
            )}
          </>
        ) : null}

        {section === "members" ? (
          <>
            <SectionTitle title="Members" description="Who in your company can see candidate evidence and act on it." />
            <Group label="Workspace members">
              <Row label="Active members" help="Everyone here can read submissions and reports for this workspace.">
                <Value>{memberCount ?? "Unknown"}</Value>
              </Row>
              <Row label="Invite and manage" help="Add reviewers, change roles and remove access.">
                <Link href="/app/employer/team" className={linkClass}>
                  Open Team
                </Link>
              </Row>
            </Group>
          </>
        ) : null}

        {section === "candidates" ? (
          <>
            <SectionTitle title="Candidate experience" description="What candidates receive and what they need to take part." />
            <Group label="Invitations">
              <Row label="Email delivery" help="Invitation emails sent from Fydell on your behalf.">
                {emailConfigured ? (
                  <StatusDot tone="ok">Sending</StatusDot>
                ) : (
                  <StatusDot tone="attention">Not configured, share links by hand</StatusDot>
                )}
              </Row>
              <Row label="Where candidates work" help="Simulations run in the Fydell desktop app on the candidate's own computer, in their own editor.">
                <Link href="/download" className={linkClass}>
                  Desktop app
                </Link>
              </Row>
            </Group>
            <Group label="After submission">
              <Row label="Candidate report" help="Candidates see the report only after your team releases it, without private notes.">
                <Value muted>Released by reviewers</Value>
              </Row>
              <Row label="Accommodations" help="Extra time and other adjustments are set per simulation by its author.">
                <Link href="/app/employer/work-samples" className={linkClass}>
                  Work samples
                </Link>
              </Row>
            </Group>
          </>
        ) : null}

        {section === "privacy" ? (
          <>
            <SectionTitle title="Data & privacy" description="What this workspace holds, who can read it and how long it stays." />
            <Group label="Access">
              <Row label="Who can read candidate work" help="Membership of this workspace is the boundary.">
                <Value muted>Workspace members and the candidate</Value>
              </Row>
              <Row label="Public directory" help="No other company can see your candidates or their reports.">
                <Value muted>None</Value>
              </Row>
            </Group>
            <Group label="Retention">
              <Row label="How long it is kept" help="Evaluation data stays until it is deleted on request. Agree a fixed retention period with us before running a cohort.">
                <Value muted>Until deleted</Value>
              </Row>
              <Row label="Export or correct data" help="Email us from an address on this workspace and we confirm what we hold before acting.">
                <ContactLink className={linkClass} />
              </Row>
            </Group>
            {memberRole === "owner" && !preview ? (
              <Group label="Delete workspace">
                <Row
                  label={`Delete ${workspaceName}`}
                  help="Erases the workspace and everything in it for every member. Fydell confirms with you by email before acting."
                  stack
                >
                  <WorkspaceDeletionRequest workspaceName={workspaceName} requestedAt={deletionRequestedAt} />
                </Row>
              </Group>
            ) : null}
            <Group label="Responsibility">
              <Row label="Hiring decisions" help="Fydell produces evidence, not decisions. Your organization remains responsible for the decisions it makes using these reports." />
            </Group>
          </>
        ) : null}

        {section === "plan" ? (
          <>
            <SectionTitle title="Plan & billing" description="Billing covers completed simulations. Candidates never pay." />
            {billingNotice ? (
              <p role="status" className="mb-5 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-[14px] text-[var(--text-primary)]">
                {billingNotice}
              </p>
            ) : null}
            <Group label="Subscription">
              <Row label="Current plan" help={billingReady ? undefined : "Online checkout is not enabled on this deployment. Pilot plans are invoiced directly."}>
                <Value>{planLabel}</Value>
                {billing?.currentPeriodEnd && hasSubscription ? (
                  <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
                    Renews {new Date(billing.currentPeriodEnd).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </p>
                ) : null}
              </Row>
              {billingReady ? (
                <Row label={hasSubscription ? "Manage billing" : "Choose a plan"} help="Checkout and invoices are handled by Stripe." stack>
                  <PlanControls hasSubscription={hasSubscription} canManage={canEdit} suggestedPlan={suggestedPlan} />
                </Row>
              ) : (
                <Row label="Invoices" help="Questions about an invoice or a pilot agreement.">
                  <ContactLink className={linkClass} />
                </Row>
              )}
            </Group>
          </>
        ) : null}
      </div>
    </div>
  );
}
