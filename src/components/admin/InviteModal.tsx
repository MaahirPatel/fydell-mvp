"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InviteResult {
  inviteUrl: string;
  employerName: string;
  employerUrl: string;
  employerPasscode: string;
  emailed: boolean;
}

export default function InviteModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  const valid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    employerName.trim().length >= 2 &&
    role.trim().length >= 2;

  function reset() {
    setName("");
    setEmail("");
    setEmployerName("");
    setRole("");
    setError(null);
    setResult(null);
  }

  function close() {
    setOpen(false);
    reset();
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          employerName: employerName.trim(),
          role: role.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create invite.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-navy px-5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal"
      >
        Invite Candidate
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-fade-up rounded-2xl border border-line bg-white p-7 shadow-[var(--shadow-pop)]">
            {!result ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl">Invite a candidate</h2>
                  <button
                    onClick={close}
                    className="text-muted hover:text-navy"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={submit} className="mt-5 grid gap-3.5">
                  <Field label="Candidate name" value={name} onChange={setName} />
                  <Field
                    label="Candidate email"
                    value={email}
                    onChange={setEmail}
                    type="email"
                  />
                  <Field
                    label="Employer / company"
                    value={employerName}
                    onChange={setEmployerName}
                  />
                  <Field label="Role" value={role} onChange={setRole} />

                  {error && (
                    <div className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-2.5 text-sm text-coral-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!valid || loading}
                    className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-semibold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:bg-teal disabled:opacity-45"
                  >
                    {loading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}
                    Create &amp; send invite
                  </button>
                </form>
              </>
            ) : (
              <div className="grid gap-4">
                <h2 className="text-xl">Invite created</h2>
                <p className="text-sm text-ink-2">
                  {result.emailed
                    ? "We emailed the simulation link to the candidate."
                    : "Email is not configured, so copy the link below and send it manually."}
                </p>
                <CopyRow label="Candidate simulation link" value={result.inviteUrl} />
                <div className="rounded-xl border border-line bg-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {result.employerName} - employer access
                  </p>
                  <CopyRow label="Leaderboard URL" value={result.employerUrl} compact />
                  <CopyRow label="Passcode" value={result.employerPasscode} compact />
                </div>
                <button
                  onClick={close}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-navy px-5 font-semibold text-white transition-all duration-200 hover:bg-teal"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line bg-bg px-4 py-2.5 outline-none transition-colors focus:border-blue"
      />
    </label>
  );
}

function CopyRow({
  label,
  value,
  compact
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={compact ? "mt-2" : ""}>
      <p className="text-xs font-semibold text-ink-2">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink">
          {value}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
