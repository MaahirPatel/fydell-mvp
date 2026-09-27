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

export function TeamManager({ members, canManage, actorIsOwner }: { members: TeamMember[]; canManage: boolean; actorIsOwner: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("reviewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await engFetch<{ status: "invited" | "already_member" }>("/api/eng/members", { body: { email, role } });
    setBusy(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setNotice(res.data.status === "already_member" ? "That person is already an active member." : "Added as invited. They become a member when they accept it from their own Team page.");
    setEmail("");
    router.refresh();
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
      <ul className="divide-y divide-[var(--border-subtle)]">
        {members.map((m) => {
          const label = m.email ?? "Unknown account";
          const locked = !canManage || m.isSelf || (m.role === "owner" && !actorIsOwner);
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-app-body text-[var(--text-primary)]">
                  {label}
                  {m.isSelf ? <span className="text-[var(--text-tertiary)]"> (you)</span> : null}
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
          <FormSuccess>{notice}</FormSuccess>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Field label="Add a member" htmlFor="member-email" help="They need a Fydell account with this email. No email is sent; they accept from their own Team page.">
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

export function PendingMemberships({ items }: { items: { id: string; organizationName: string; roleLabel: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
            onClick={async () => {
              const res = await engFetch("/api/eng/members/accept", { body: { membershipId: item.id } });
              if (res.ok === false) setError(res.error);
              else router.refresh();
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
