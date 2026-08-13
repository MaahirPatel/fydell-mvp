"use client";

/**
 * The candidate's control over their own Work Receipt.
 *
 * The backend has supported field scoping, an expiry, an audience label and
 * revocation since the receipt was built. None of it was reachable: the only
 * control was one button that minted a thirty-day link with a default set of
 * fields chosen for the candidate. A receipt the candidate cannot scope is not
 * a receipt they control, so this is the surface that makes the existing
 * capability real.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Surface, SurfaceHeader } from "@/components/ui/Surface";
import { StatusTag } from "@/components/ui/StatusTag";

/** Plain descriptions of each scopeable field, in the order they are offered. */
const FIELD_LABEL: Record<string, { label: string; detail: string }> = {
  role_title: { label: "Role", detail: "The role the evaluation was for." },
  evaluation_title: { label: "Evaluation", detail: "Which evaluation you took." },
  completion_date: { label: "Completion date", detail: "The day you submitted." },
  duration: { label: "Working time", detail: "How long the evaluation runs." },
  task_summary: { label: "The task", detail: "What you were asked to do." },
  deliverable_summary: {
    label: "What you concluded",
    detail: "Your own answer, in your words.",
  },
  evidence_summaries: {
    label: "Evidence summaries",
    detail: "What the assessment observed in your work.",
  },
  coverage_confidence: {
    label: "Coverage and confidence",
    detail: "How much of the work the assessment could see.",
  },
  scenario_score: {
    label: "Score",
    detail: "The numeric result. You can leave this out.",
  },
  ai_policy_note: {
    label: "AI use note",
    detail: "What was recorded about assistant use.",
  },
  evaluator_version: {
    label: "Evaluator version",
    detail: "Which version of the scoring produced this.",
  },
  limitations: {
    label: "Limitations",
    detail: "What this result does not establish.",
  },
};

const DEFAULT_FIELDS = [
  "role_title",
  "evaluation_title",
  "completion_date",
  "evidence_summaries",
];

const EXPIRY_OPTIONS: [string, string][] = [
  ["7", "7 days"],
  ["14", "14 days"],
  ["30", "30 days"],
  ["60", "60 days"],
  ["90", "90 days"],
];

interface ShareRecord {
  id: string;
  audienceLabel: string;
  allowedFields: string[];
  expiresAt: string;
  createdAt: string;
  revoked: boolean;
  expired: boolean;
  openedCount: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function WorkReceiptPermission({ sessionId }: { sessionId: string }) {
  const [catalog, setCatalog] = useState<string[]>([]);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [selected, setSelected] = useState<string[]>(DEFAULT_FIELDS);
  const [audience, setAudience] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Bumped after issuing or revoking a share to re-read the server's list.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/sim/results/${sessionId}/share`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load your share links");
        setCatalog(data.fieldCatalog || []);
        setShares(data.shares || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your share links");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadKey]);

  const toggle = (field: string) => {
    setSelected((current) =>
      current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field]
    );
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sim/results/${sessionId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedFields: selected,
          audienceLabel: audience.trim() || "Authorized viewer",
          expiresInDays: Number(expiry),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the link");
      setIssued({ url: data.recordUrl, expiresAt: data.expiresAt });
      setAudience("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (shareId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sim/results/${sessionId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not revoke the link");
      if (issued) setIssued(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke the link");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your link:", issued.url);
    }
  };

  const fields = catalog.length > 0 ? catalog : Object.keys(FIELD_LABEL);
  const live = shares.filter((s) => !s.revoked && !s.expired);

  return (
    <Surface tone="panel">
      <SurfaceHeader
        title="Share your Work Receipt"
        description="You decide what a link contains, how long it lasts, and when it stops working. Nothing is shared until you create a link."
      />

      <div className="space-y-5 px-5 py-4">
        <fieldset>
          <legend className="text-[13px] font-medium text-[var(--text-primary)]">
            What to include
          </legend>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
            Anything you leave unchecked is not in the link at all. It is not
            hidden behind a control the viewer can open.
          </p>
          <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
            {fields.map((field) => {
              const meta = FIELD_LABEL[field] || { label: field, detail: "" };
              const on = selected.includes(field);
              return (
                <li key={field}>
                  <label className="flex cursor-pointer gap-2.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(field)}
                      className="mt-[3px] h-[15px] w-[15px] shrink-0 accent-[var(--fydell-evidence)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-[var(--text-primary)]">
                        {meta.label}
                      </span>
                      {meta.detail ? (
                        <span className="block text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
                          {meta.detail}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Who is it for"
            htmlFor="receipt-audience"
            optional
            help="Recorded with the link so you can tell two links apart later."
          >
            <Input
              id="receipt-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Hiring manager at Aldenmoor"
            />
          </Field>
          <Field label="Stops working after" htmlFor="receipt-expiry">
            <Select
              id="receipt-expiry"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            >
              {EXPIRY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            loading={busy}
            disabled={selected.length === 0}
            onClick={() => void create()}
          >
            Create a link
          </Button>
          {selected.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              Choose at least one thing to include.
            </p>
          ) : null}
        </div>

        {issued ? (
          <div
            role="status"
            className="rounded-[var(--radius-panel)] border border-[rgba(107,140,255,0.35)] bg-[rgba(107,140,255,0.08)] px-4 py-3"
          >
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              Your link is ready. Copy it now.
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
              Fydell stores only a hash of it, so this is the one time it can be
              shown. If you lose it, revoke it and make another.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)]">
                {issued.url}
              </code>
              <Button variant="secondary" size="sm" onClick={() => void copy()}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--fydell-risk)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--border-subtle)]">
        <div className="flex items-baseline justify-between gap-4 px-5 py-3">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
            Links you have created
          </h3>
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {live.length === 0
              ? "None active"
              : `${live.length} active`}
          </span>
        </div>

        {!loaded ? (
          <p className="px-5 pb-4 text-[13px] text-[var(--text-tertiary)]">Loading.</p>
        ) : shares.length === 0 ? (
          <p className="px-5 pb-4 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
            You have not shared this receipt with anyone. The company that
            invited you can already see your result; a link is only for someone
            else.
          </p>
        ) : (
          <ul className="border-t border-[var(--border-subtle)]">
            {shares.map((share) => {
              const dead = share.revoked || share.expired;
              return (
                <li
                  key={share.id}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-[var(--border-subtle)] px-5 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] text-[var(--text-primary)]">
                        {share.audienceLabel}
                      </p>
                      <StatusTag tone={dead ? "neutral" : "active"}>
                        {share.revoked
                          ? "Revoked"
                          : share.expired
                            ? "Expired"
                            : "Active"}
                      </StatusTag>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)]">
                      {share.allowedFields.length} of {fields.length} fields
                      {dead
                        ? ` · ${share.revoked ? "revoked" : "expired"}`
                        : ` · stops working ${formatDate(share.expiresAt)}`}
                      {` · opened ${share.openedCount} ${
                        share.openedCount === 1 ? "time" : "times"
                      }`}
                    </p>
                  </div>
                  {!dead ? (
                    <Button
                      variant="quiet"
                      size="sm"
                      disabled={busy}
                      onClick={() => void revoke(share.id)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Surface>
  );
}

export default WorkReceiptPermission;
