"use client";

import Link from "next/link";
import { useState } from "react";
import type { PassportEvidence } from "@/lib/passport/view";
import RequirementEvidenceReview from "./RequirementEvidenceReview";

export interface RoleOption {
  id: string;
  title: string;
  required: string[];
}

/**
 * Review the candidate's evidence against one role's required capabilities.
 * When the Passport arrived through a role page, that role is preselected.
 */
export default function RoleReviewSection({
  shareId,
  candidateName,
  evidence,
  roles,
  initialRoleId,
}: {
  shareId: string;
  candidateName: string;
  evidence: PassportEvidence[];
  roles: RoleOption[];
  initialRoleId?: string | null;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    initialRoleId && roles.some((r) => r.id === initialRoleId) ? initialRoleId : roles.length === 1 ? roles[0].id : null,
  );
  const selected = roles.find((r) => r.id === selectedRoleId);

  return (
    <section className="mt-8" aria-labelledby="role-review-heading">
      <h2 id="role-review-heading" className="text-app-section text-[var(--text-primary)]">
        Review against role requirements
      </h2>
      <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
        For each required capability, note whether the evidence supports it, falls short, is missing, or raises a concern.
      </p>

      {roles.length === 0 ? (
        <div className="mt-4 rounded-[10px] border border-dashed border-[var(--border-default)] p-5">
          <p className="text-app-body font-medium text-[var(--text-primary)]">No roles yet</p>
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
            Create a role with its required capabilities, then come back to review this evidence against it.
          </p>
          <Link href="/app/employer/openings/new" className="mt-3 inline-block text-app-meta font-medium text-[var(--text-primary)] underline underline-offset-4">
            Create a role
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Role">
            {roles.map((r) => {
              const active = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedRoleId(active ? null : r.id)}
                  className={`h-8 rounded-full border px-3.5 text-app-meta font-medium transition-colors ${
                    active
                      ? "border-[var(--control-solid)] bg-[var(--control-solid)] text-[var(--control-solid-ink)]"
                      : "border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {r.title}
                </button>
              );
            })}
          </div>

          {selected && selected.required.length > 0 ? (
            <div className="mt-4">
              <RequirementEvidenceReview
                key={selected.id}
                roleId={selected.id}
                shareId={shareId}
                roleTitle={selected.title}
                requirements={selected.required}
                evidence={evidence}
                candidateName={candidateName}
              />
            </div>
          ) : null}

          {selected && selected.required.length === 0 ? (
            <p className="mt-4 text-app-meta text-[var(--text-secondary)]">
              This role has no required capabilities yet.{" "}
              <Link href={`/app/employer/openings/${selected.id}/edit`} className="underline underline-offset-4">
                Add them
              </Link>{" "}
              to review against it.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
