"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/Field";
import { StatusTag } from "@/components/ui/StatusTag";
import { engFetch } from "./api";

type Role = "owner" | "admin" | "hiring_manager" | "reviewer" | "viewer";

const ROLE_OPTIONS: { key: Role; label: string; help: string }[] = [
  { key: "owner", label: "Owner", help: "Everything, including other owners." },
  { key: "admin", label: "Admin", help: "Manage roles, candidates and members." },
  { key: "hiring_manager", label: "Hiring manager", help: "Create roles, invite, read reports, decide." },
  { key: "reviewer", label: "Reviewer", help: "Read reports, add notes, record decisions." },
  { key: "viewer", label: "Viewer", help: "Follow progress. Cannot read evidence." },
];

export interface TeamMember {
  id: string;
  email: string | null;
  role: Role;
  status: "invited" | "active" | "suspended" | "removed";
  isSelf: boolean;
}

type InviteResult = { status: "already_member" } | { status: "invited"; emailDelivery: "sent" | "failed" | "not_configured" };
type Notice = { tone: "success" | "info"; text: string };

function inviteNotice(result: InviteResult, email: string): Notice {
  if (result.status === "already_member") return { tone: "info", text: `${email} is already an active member.` };
  const pending = "It is waiting on their Team page and in their notifications until they accept.";
  if (result.emailDelivery === "sent") return { tone: "success", text: `Invitation saved and email sent to ${email}. ${pending}` };
  if (result.emailDelivery === "failed") return { tone: "info", text: `Invitation saved, but the email to ${email} could not be sent. ${pending} Use Resend invitation to try the email again.` };
  return { tone: "info", text: `Invitation saved. No email was sent because email delivery is not set up here. ${pending}` };
}

export function TeamManager({ members, canManage, actorIsOwner }: { members: TeamMember[]; canManage: boolean; actorIsOwner: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("reviewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  async function send(target: string, targetRole: Role): Promise<boolean> {
    setError(null);
    setNotice(null);
    const res = await engFetch<InviteResult>("/api/eng/members", { body: { email: target, role: targetRole } });
    if (res.ok === false) {
      setError(res.error);
      return false;
    }
    setNotice(inviteNotice(res.data, target));
    router.refresh();
    return true;
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const done = await send(email, role);
    setBusy(false);
    if (done) setEmail("");
  }

  async function resend(member: TeamMember) {
    if (!member.email) return;
    setResending(member.id);
    await send(member.email, member.role);
    setResending(null);
  }

  async function change(memberId: string, next: Role) {
    setError(null);
    const res = await engFetch(`/api/eng/members/${memberId}`, { method: "PATCH", body: { role: next } });
    if (res.ok === false) setError(res.error);
    router.refresh();
  }

  async function remove(memberId: string, label: string) {
    if (!window.confirm(`Remove ${label} from this workspace? They lose access immediately.`)) return;
    setError(null);
    const res = await engFetch(`/api/eng/members/${memberId}`, { method: "DELETE" });
    if (res.ok === false) setError(res.error);
    router.refresh();
  }

  const assignable = ROLE_OPTIONS.filter((o) => actorIsOwner || o.key !== "owner");

  return (
    <div className="grid gap-5">
      <FormError>{error}</FormError>
      {notice?.tone === "success" ? <FormSuccess>{notice.text}</FormSuccess> : null}
      {notice?.tone === "info" ? (
        <p role="status" className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-support)] px-3 py-2 text-app-body text-[var(--text-secondary)]">
          {notice.text}
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--border-subtle)]">
        {members.map((m) => {
          const label = m.email ?? "Unknown account";
          const locked = !canManage || m.isSelf || (m.role === "owner" && !actorIsOwner);
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 max-w-full">
                <p className="flex min-w-0 items-baseline gap-1 text-app-body text-[var(--text-primary)]">
                  <span className="truncate" title={label}>{label}</span>
                  {m.isSelf ? <span className="shrink-0 text-[var(--text-tertiary)]">(you)</span> : null}
                </p>
                {m.status !== "active" ? <StatusTag tone="changed" className="mt-1">{m.status === "invited" ? "Invited, not accepted" : m.status}</StatusTag> : null}
              </div>
              <div className="flex items-center gap-2">
                {locked ? (
                  <span className="text-app-meta text-[var(--text-secondary)]">{ROLE_OPTIONS.find((o) => o.key === m.role)?.label}</span>
                ) : (
                  <Select aria-label={`Role for ${label}`} value={m.role} onChange={(e) => change(m.id, e.target.value as Role)}>
                    {assignable.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
                {!locked && m.status === "invited" && m.email ? (
                  <Button size="sm" variant="secondary" loading={resending === m.id} disabled={resending !== null && resending !== m.id} onClick={() => resend(m)}>
                    Resend invitation
                  </Button>
                ) : null}
                {!locked ? (
                  <Button size="sm" variant="quiet" onClick={() => remove(m.id, label)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {canManage ? (
        <form onSubmit={invite} className="grid gap-3 border-t border-[var(--border-subtle)] pt-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Field label="Add a member" htmlFor="member-email" help="They need a Fydell account with this email. They join only after accepting from their own Team page.">
              <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Role" htmlFor="member-role" help={ROLE_OPTIONS.find((o) => o.key === role)?.help}>
              <Select id="member-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {assignable.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div>
            <Button type="submit" variant="primary" loading={busy}>
              Add member
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function PendingMemberships({ items, afterAccept }: { items: { id: string; organizationName: string; roleLabel: string }[]; afterAccept?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <div className="grid gap-2">
      <FormError>{error}</FormError>
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--border-default)] px-3 py-2.5">
          <p className="text-app-body text-[var(--text-primary)]">
            {item.organizationName} added you as {item.roleLabel}.
          </p>
          <Button
            size="sm"
            variant="primary"
            loading={accepting === item.id}
            disabled={accepting !== null && accepting !== item.id}
            onClick={async () => {
              setError(null);
              setAccepting(item.id);
              const res = await engFetch("/api/eng/members/accept", { body: { membershipId: item.id } });
              if (res.ok === false) {
                setError(res.error);
                setAccepting(null);
              } else if (afterAccept) router.push(afterAccept);
              else {
                setAccepting(null);
                router.refresh();
              }
            }}
          >
            Accept and switch
          </Button>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceSwitcher({ current, options }: { current: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  if (options.length < 2) return null;
  return (
    <Select
      aria-label="Active workspace"
      value={current}
      onChange={async (e) => {
        const res = await engFetch("/api/eng/members/active", { body: { organizationId: e.target.value } });
        if (res.ok) router.refresh();
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </Select>
  );
}
