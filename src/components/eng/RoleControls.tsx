"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/Field";
import { engFetch } from "./api";

export function RoleStatusActions({ roleId, status }: { roleId: string; status: "draft" | "published" | "archived" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: "published" | "archived") {
    const message =
      next === "published"
        ? "Publish this role? Its details and task version are frozen once published, so every candidate gets the same task."
        : "Archive this role? Existing candidates can finish, but you cannot invite anyone new.";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError(null);
    const res = await engFetch(`/api/eng/roles/${roleId}`, { method: "PATCH", body: { status: next } });
    setBusy(false);
    if (res.ok === false) setError(res.error);
    else router.refresh();
  }

  if (status === "archived") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {error ? <span className="text-app-meta text-[var(--fydell-risk)]">{error}</span> : null}
      {status === "draft" ? (
        <Button variant="primary" loading={busy} onClick={() => change("published")}>
          Publish role
        </Button>
      ) : null}
      <Button variant="secondary" disabled={busy} onClick={() => change("archived")}>
        Archive
      </Button>
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

const DELIVERY_MESSAGE = {
  sent: "Invitation emailed. You can also share the link below yourself.",
  failed: "The email could not be sent. Share the link below with the candidate yourself.",
  not_configured: "Email sending is not configured on this deployment, so nothing was emailed. Share the link below with the candidate yourself.",
} as const;

type InviteResult = {
  url: string;
  emailDelivery: keyof typeof DELIVERY_MESSAGE;
  notified: boolean;
  handle?: string;
  name?: string | null;
};

export function InviteCandidateForm({ roleId }: { roleId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"handle" | "email">("handle");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const body = mode === "handle" ? { handle } : { email, name };
    const res = await engFetch<InviteResult>(`/api/eng/roles/${roleId}/invitations`, { body });
    setBusy(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setResult(res.data);
    setHandle("");
    setEmail("");
    setName("");
    router.refresh();
  }

  const tab = (value: "handle" | "email", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      className={`h-8 rounded-md px-3 text-app-meta transition-colors ${
        mode === value
          ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[0_0_0_1px_var(--border-default)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="grid gap-3">
      <FormError>{error}</FormError>
      {result ? (
        <FormSuccess>
          {result.handle ? (
            <span className="block">
              Invited {result.name ? `${result.name} (@${result.handle})` : `@${result.handle}`}. They have a notification in Fydell
              {result.emailDelivery === "sent" ? " and an email." : "."}
            </span>
          ) : (
            DELIVERY_MESSAGE[result.emailDelivery]
          )}
          <CopyLink url={result.url} />
          <span className="mt-2 block text-app-meta">This link is shown once. Resending creates a new link and stops this one working.</span>
        </FormSuccess>
      ) : null}
      <div role="tablist" aria-label="Invite by" className="inline-flex w-fit gap-1 rounded-lg bg-[var(--surface-hover)] p-1">
        {tab("handle", "Engineer on Fydell")}
        {tab("email", "By email")}
      </div>
      {mode === "handle" ? (
        <Field label="Handle" htmlFor="inv-handle" help="Their @handle from their Fydell profile. Their email stays private.">
          <Input
            id="inv-handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@maya"
            autoComplete="off"
            spellCheck={false}
            maxLength={31}
            required
          />
        </Field>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Candidate email" htmlFor="inv-email" help="They must sign in with this address to accept.">
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Name" htmlFor="inv-name" optional>
            <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
        </div>
      )}
      <div>
        <Button type="submit" variant="primary" loading={busy}>
          Create invitation
        </Button>
      </div>
    </form>
  );
}

export function InvitationActions({
  invitationId,
  attemptId,
  canResend,
  canWithdraw,
  canExtend,
}: {
  invitationId: string;
  attemptId: string | null;
  canResend: boolean;
  canWithdraw: boolean;
  canExtend: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function act(action: "resend" | "withdraw") {
    let reason = "";
    if (action === "withdraw") {
      const answer = window.prompt("Withdraw this invitation? The candidate will no longer be able to work on or submit the task. Reason (kept in the audit trail):");
      if (answer === null) return;
      reason = answer;
    }
    setBusy(true);
    setMessage(null);
    const res = await engFetch<{ url?: string; emailDelivery?: string }>(`/api/eng/invitations/${invitationId}`, { body: { action, reason } });
    setBusy(false);
    if (res.ok === false) {
      setMessage(res.error);
      return;
    }
    if (action === "resend" && res.data.url) {
      setLink(res.data.url);
      setMessage(res.data.emailDelivery === "sent" ? "Emailed a new link. The old link no longer works." : "New link created (not emailed). The old link no longer works.");
    }
    router.refresh();
  }

  async function extend() {
    if (!attemptId) return;
    const minutesRaw = window.prompt("Extend the deadline by how many minutes? (15 to 240)", "30");
    if (minutesRaw === null) return;
    const reason = window.prompt("Reason for the extension (shown in the audit trail):", "Accommodation");
    if (reason === null) return;
    setBusy(true);
    setMessage(null);
    const res = await engFetch(`/api/eng/org/attempts/${attemptId}/extend`, { body: { minutes: Number(minutesRaw), reason } });
    setBusy(false);
    if (res.ok === false) setMessage(res.error);
    else router.refresh();
  }

  if (!canResend && !canWithdraw && !canExtend) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        {canResend ? (
          <Button size="sm" variant="quiet" disabled={busy} onClick={() => act("resend")}>
            Resend
          </Button>
        ) : null}
        {canExtend ? (
          <Button size="sm" variant="quiet" disabled={busy} onClick={extend}>
            Extend
          </Button>
        ) : null}
        {canWithdraw ? (
          <Button size="sm" variant="quiet" disabled={busy} onClick={() => act("withdraw")}>
            Withdraw
          </Button>
        ) : null}
      </div>
      {message ? <p className="max-w-[320px] text-right text-app-meta text-[var(--text-secondary)]">{message}</p> : null}
      {link ? <CopyLink url={link} /> : null}
    </div>
  );
}
