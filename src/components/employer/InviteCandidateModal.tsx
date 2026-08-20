"use client";

/**
 * Shared invite drawer for the employer workspace.
 *
 * Wrap a tree in <InviteModalProvider catalog={...}> and call
 * useInviteModal().open({ roleKey, slug }) from any client component.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { Field, FormError, Input, Select } from "@/components/ui/Field";
import type { CatalogRole } from "./catalog-types";

interface OpenOptions {
  roleKey?: string;
  slug?: string;
}

interface InviteModalContextValue {
  open: (options?: OpenOptions) => void;
}

const InviteModalContext = createContext<InviteModalContextValue | null>(null);

export function useInviteModal(): InviteModalContextValue {
  const ctx = useContext(InviteModalContext);
  if (!ctx) throw new Error("useInviteModal must be used inside InviteModalProvider");
  return ctx;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPIRATION_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

interface SentResult {
  inviteUrl: string;
  emailDelivery: string;
  email: string;
}

/** With one published evaluation there is nothing to choose, so pick it. */
function defaultSlugFor(role: CatalogRole | undefined): string {
  const available = (role?.sims || []).filter((s) => s.templateId);
  return available.length === 1 ? available[0].slug : "";
}

export function InviteModalProvider({
  catalog,
  children,
}: {
  catalog: CatalogRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState(catalog[0]?.key || "");
  const [slug, setSlug] = useState(() => defaultSlugFor(catalog[0]));
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedRole = useMemo(
    () => catalog.find((r) => r.key === roleKey) || catalog[0],
    [catalog, roleKey]
  );
  const selectedSim = selectedRole?.sims.find((s) => s.slug === slug) || null;
  const simOptions = selectedRole?.sims || [];

  const open = useCallback(
    (options?: OpenOptions) => {
      const targetRoleKey =
        (options?.slug &&
          catalog.find((r) => r.sims.some((s) => s.slug === options.slug))?.key) ||
        options?.roleKey ||
        catalog[0]?.key ||
        "";
      const targetRole = catalog.find((r) => r.key === targetRoleKey);
      setRoleKey(targetRoleKey);
      setSlug(options?.slug || defaultSlugFor(targetRole));
      setName("");
      setEmail("");
      setExpiresInDays(14);
      setError(null);
      setSent(null);
      setCopied(false);
      setIsOpen(true);
    },
    [catalog]
  );

  const close = useCallback(() => setIsOpen(false), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!selectedSim) {
      setError("Choose an evaluation.");
      return;
    }
    if (!selectedSim.templateId) {
      setError("That evaluation is not published yet. Choose another.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/sim/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedSim.templateId,
          candidates: [{ email: trimmedEmail, name: name.trim() || undefined }],
          expiresInDays,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: string[];
        created?: { email: string; inviteUrl: string; emailDelivery: string }[];
      };
      if (!res.ok) throw new Error(data.error || "Could not send the invitation.");
      const created = data.created?.[0];
      if (!created) {
        throw new Error(data.errors?.[0] || "Could not send the invitation.");
      }
      setSent({
        inviteUrl: created.inviteUrl,
        emailDelivery: created.emailDelivery,
        email: created.email,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const contextValue = useMemo(() => ({ open }), [open]);

  return (
    <InviteModalContext.Provider value={contextValue}>
      {children}
      <Drawer
        open={isOpen}
        onClose={close}
        title={sent ? "Invitation created" : "Invite a candidate"}
        description={
          sent
            ? undefined
            : "They receive one private link. It works once and then expires."
        }
        footer={
          sent ? (
            <>
              <Button
                variant="quiet"
                onClick={() => {
                  setSent(null);
                  setEmail("");
                  setName("");
                  setError(null);
                }}
              >
                Invite another
              </Button>
              <Button variant="primary" onClick={close}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="quiet" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={(e) => void submit(e)}
              >
                Send invitation
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3.5 py-3">
              <p className="text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                {sent.emailDelivery === "sent" || sent.emailDelivery === "delivered"
                  ? `Email ${sent.emailDelivery === "delivered" ? "delivered to" : "sent to"} ${sent.email}. The invitation record is created.`
                  : sent.emailDelivery === "failed"
                    ? `The invitation record was created, but email failed. Share this copyable link with ${sent.email}. This is not a delivered invitation.`
                    : `The invitation record was created. Email is not configured, so nothing was sent. Share this copyable development link with ${sent.email}. This is not a delivered invitation.`}
              </p>
            </div>
            <div>
              <p className="text-[12.5px] text-[var(--text-tertiary)]">Secure link</p>
              <p className="mt-1 break-all rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-band)] px-3 py-2 font-mono text-[12.5px] text-[var(--text-secondary)]">
                {sent.inviteUrl}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => void copyLink()}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <Field label="Candidate email" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={Boolean(error)}
              />
            </Field>

            <Field label="Candidate name" htmlFor="invite-name" optional>
              <Input
                id="invite-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            {catalog.length > 1 ? (
              <Field label="Role" htmlFor="invite-role">
                <Select
                  id="invite-role"
                  value={roleKey}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    setRoleKey(nextKey);
                    setSlug(defaultSlugFor(catalog.find((r) => r.key === nextKey)));
                  }}
                >
                  {catalog.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {simOptions.length > 1 ? (
              <Field
                label="Evaluation"
                htmlFor="invite-sim"
                help={selectedSim?.tagline}
              >
                <Select
                  id="invite-sim"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                >
                  <option value="" disabled>
                    Choose an evaluation
                  </option>
                  {simOptions.map((s) => (
                    <option key={s.slug} value={s.slug} disabled={!s.templateId}>
                      {s.title}
                      {!s.templateId ? " (not published)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : selectedSim ? (
              <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3.5 py-3">
                <p className="text-[12.5px] text-[var(--text-tertiary)]">Evaluation</p>
                <p className="mt-0.5 text-[13.5px] font-medium text-[var(--text-primary)]">
                  {selectedSim.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
                  {selectedSim.tagline}
                </p>
              </div>
            ) : null}

            <Field label="Link expires in" htmlFor="invite-expiry">
              <Select
                id="invite-expiry"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              >
                {EXPIRATION_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <FormError>{error}</FormError>

            {/* Enter submits the form; the visible control lives in the footer. */}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Drawer>
    </InviteModalContext.Provider>
  );
}
