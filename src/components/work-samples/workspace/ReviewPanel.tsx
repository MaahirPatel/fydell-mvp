"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { api } from "../api";
import { Banner, LocalTime, StatusIcon, StatusText } from "../ui";
import type { DraftState } from "../types";

export function ReviewPanel({
  state,
  canApprove,
  canPublish,
  dirty,
  onChanged,
  onOpenPreview,
}: {
  state: DraftState;
  canApprove: boolean;
  canPublish: boolean;
  dirty: boolean;
  onChanged: () => Promise<void>;
  onOpenPreview: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"approve" | "changes" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sha = state.packageSha256;
  const approval = state.approval;
  const nextVersion = state.draft.nextVersion;

  async function review(decision: "approved" | "changes_requested") {
    if (!sha) return;
    setBusy(decision === "approved" ? "approve" : "changes");
    setError(null);
    const res = await api<{ approvalId: string }>(`/api/eng/authoring/drafts/${state.draft.id}/review`, { body: { decision, notes, packageSha256: sha } });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setNotes("");
    await onChanged();
  }

  async function publish() {
    if (!sha) return;
    setBusy("publish");
    setError(null);
    const res = await api<{ versionId: string; version: number }>(`/api/eng/authoring/drafts/${state.draft.id}/publish`, { body: { packageSha256: sha } });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    await onChanged();
  }

  const approveBlocked = !state.previewedCurrentVersion
    ? "Open the candidate preview of this version first."
    : dirty
      ? "Wait for your edits to save."
      : null;
  const archived = state.draft.status === "archived";

  return (
    <Panel>
      <PanelSection title="Review and publish">
        <div className="grid gap-3">
          {approval ? (
            approval.current && approval.decision === "approved" ? (
              <StatusText tone="good">Approved by {approval.reviewerName}</StatusText>
            ) : approval.decision === "changes_requested" ? (
              <div className="text-[14px] leading-[1.5]">
                <StatusText tone="warn">Changes requested by {approval.reviewerName}</StatusText>
                {approval.notes ? <p className="mt-1 whitespace-pre-line text-[var(--text-body)]">{approval.notes}</p> : null}
                <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]"><LocalTime iso={approval.createdAt} /></p>
              </div>
            ) : (
              <StatusText tone="neutral">Approved by {approval.reviewerName} for an earlier version</StatusText>
            )
          ) : (
            <StatusText tone="pending">Not reviewed yet</StatusText>
          )}

          {state.publishGate.length ? (
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Before publishing</p>
              <ul className="mt-1.5 grid gap-1.5">
                {state.publishGate.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13.5px] leading-[1.45] text-[var(--text-body)]">
                    <StatusIcon tone="bad" className="mt-[2px] h-3.5 w-3.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <StatusText tone="good">Ready to publish</StatusText>
          )}
          {state.publishWarnings.map((w, i) => (
            <Banner key={i} tone="warn">
              {w}
            </Banner>
          ))}
        </div>
      </PanelSection>

      {canApprove && !archived ? (
        <PanelSection title="Your review">
          <div className="grid gap-3">
            {!state.previewedCurrentVersion ? (
              <p className="text-[13.5px] leading-[1.5] text-[var(--text-secondary)]">
                Approval needs you to open the candidate preview of this exact version.{" "}
                <button type="button" className="font-medium text-[var(--text-primary)] underline underline-offset-2" onClick={onOpenPreview}>
                  Open preview
                </button>
              </p>
            ) : null}
            <Field label="Notes" htmlFor="review-notes" help="Required when requesting changes.">
              <Textarea id="review-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => review("approved")} loading={busy === "approve"} disabled={Boolean(approveBlocked) || busy !== null}>
                Approve
              </Button>
              <Button variant="quiet" onClick={() => review("changes_requested")} loading={busy === "changes"} disabled={notes.trim().length < 5 || busy !== null}>
                Request changes
              </Button>
            </div>
            {approveBlocked ? <p className="text-app-meta text-[var(--text-tertiary)]">{approveBlocked}</p> : null}
          </div>
        </PanelSection>
      ) : null}

      {canPublish && !archived ? (
        <PanelSection>
          <Button variant="primary" className="w-full" onClick={publish} loading={busy === "publish"} disabled={state.publishGate.length > 0 || dirty || busy !== null}>
            Publish version {nextVersion}
          </Button>
          <p className="mt-2 text-app-meta leading-[1.45] text-[var(--text-tertiary)]">
            Publishing creates an immutable version. Nothing is sent to candidates.
          </p>
        </PanelSection>
      ) : null}

      {error ? (
        <PanelSection>
          <Banner tone="bad" role="alert">
            {error}
          </Banner>
        </PanelSection>
      ) : null}
    </Panel>
  );
}

export function PublishedPanel({ versionId, version, attachable, onOpenPreview }: { versionId: string; version: number; attachable: boolean; onOpenPreview: () => void }) {
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  async function copy() {
    const url = `${window.location.origin}/app/employer/work-samples?tab=library&version=${versionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("failed");
    }
  }
  return (
    <Panel>
      <PanelSection title={`Version ${version} published`} description="Nothing has been sent. Choose what to do next.">
        <ul className="grid gap-3 text-[14px] leading-[1.5]">
          <li>
            <Link href="/app/employer/openings" className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
              Attach to a role
            </Link>
            <p className="text-[13px] text-[var(--text-secondary)]">
              {attachable
                ? "Open an opening, then choose this work sample when you invite an applicant from their application."
                : "Openings on this server only offer work samples the invitation flow can run. This version is not offered there yet, so it cannot be attached to a role from here."}
            </p>
          </li>
          <li>
            <button type="button" onClick={onOpenPreview} className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
              Preview invitation
            </button>
            <p className="text-[13px] text-[var(--text-secondary)]">The candidate view of what was published.</p>
          </li>
          <li>
            <Link href="/app/employer/openings" className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
              Invite applicants
            </Link>
            <p className="text-[13px] text-[var(--text-secondary)]">Invitations are sent from an applicant&apos;s page on an opening, one at a time.</p>
          </li>
          <li>
            <button type="button" onClick={copy} className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
              Copy link
            </button>
            <p className="text-[13px] text-[var(--text-secondary)]" aria-live="polite">
              {copied === "ok" ? "Library link copied." : copied === "failed" ? "Could not copy. Your browser blocked clipboard access." : "Link to this version in the Library, for teammates."}
            </p>
          </li>
        </ul>
      </PanelSection>
    </Panel>
  );
}

export default ReviewPanel;
