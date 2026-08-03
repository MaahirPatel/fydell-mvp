"use client";

/**
 * Shared invite modal for the employer workspace.
 *
 * Wrap a tree in <InviteModalProvider catalog={...}> and call
 * useInviteModal().open({ roleKey, slug }) from any client component.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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
  const [slug, setSlug] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const selectedRole = useMemo(
    () => catalog.find((r) => r.key === roleKey) || catalog[0],
    [catalog, roleKey]
  );
  const selectedSim = selectedRole?.sims.find((s) => s.slug === slug) || null;

  const open = useCallback(
    (options?: OpenOptions) => {
      const targetRole =
        (options?.slug &&
          catalog.find((r) => r.sims.some((s) => s.slug === options.slug))?.key) ||
        options?.roleKey ||
        catalog[0]?.key ||
        "";
      setRoleKey(targetRole);
      setSlug(options?.slug || "");
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

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Focus the first field when the modal opens.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    // Basic focus trap: keep Tab inside the dialog.
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!selectedSim) {
      setError("Choose a simulation.");
      return;
    }
    if (!selectedSim.templateId) {
      setError("This simulation is not available yet. Pick another one.");
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
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          onKeyDown={handleKeyDown}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Invite a candidate"
            className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl"
          >
            {sent ? (
              <div>
                <h2 className="text-[18px] font-semibold text-slate-900">
                  Invitation created
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  {sent.emailDelivery === "sent"
                    ? `An email is on its way to ${sent.email}. You can also share the link directly.`
                    : `Email is not set up in this environment. Share this link with ${sent.email}.`}
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-slate-600">
                    {sent.inviteUrl}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(null);
                      setEmail("");
                      setName("");
                      setError(null);
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Invite another
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-violet-500"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)}>
                <h2 className="text-[18px] font-semibold text-slate-900">
                  Invite a candidate
                </h2>
                <p className="mt-1 text-[14px] text-slate-500">
                  The candidate gets a private link to a five-minute simulation.
                </p>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-[13.5px] font-medium text-slate-700">
                      Candidate name
                    </span>
                    <input
                      ref={firstFieldRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Diaz"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] text-slate-900 focus:border-violet-500 focus:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[13.5px] font-medium text-slate-700">
                      Candidate email
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jordan@example.com"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] text-slate-900 focus:border-violet-500 focus:outline-none"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[13.5px] font-medium text-slate-700">Role</span>
                      <select
                        value={roleKey}
                        onChange={(e) => {
                          setRoleKey(e.target.value);
                          setSlug("");
                        }}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14.5px] text-slate-900 focus:border-violet-500 focus:outline-none"
                      >
                        {catalog.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[13.5px] font-medium text-slate-700">
                        Expires in
                      </span>
                      <select
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14.5px] text-slate-900 focus:border-violet-500 focus:outline-none"
                      >
                        {EXPIRATION_OPTIONS.map((o) => (
                          <option key={o.days} value={o.days}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[13.5px] font-medium text-slate-700">
                      Simulation
                    </span>
                    <select
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14.5px] text-slate-900 focus:border-violet-500 focus:outline-none"
                    >
                      <option value="" disabled>
                        Choose a simulation
                      </option>
                      {(selectedRole?.sims || []).map((s) => (
                        <option key={s.slug} value={s.slug} disabled={!s.templateId}>
                          {s.title}
                          {!s.templateId ? " (not available yet)" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedSim && (
                      <p className="mt-1.5 text-[13px] leading-snug text-slate-500">
                        {selectedSim.tagline}
                      </p>
                    )}
                  </label>
                </div>

                {error && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
                    {error}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {busy ? "Sending" : "Send invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </InviteModalContext.Provider>
  );
}
