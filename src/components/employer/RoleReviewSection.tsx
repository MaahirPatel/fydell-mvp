"use client";

import { useEffect, useState } from "react";
import type { PassportEvidence } from "@/lib/passport/view";
import RequirementEvidenceReview from "./RequirementEvidenceReview";

interface RoleOption {
  id: string;
  title: string;
  responsibilities: string[];
  evaluation_criteria: string[];
}

/**
 * H06 integration: pick one of the org's roles, then review the candidate's
 * evidence against that role's requirements. Requirements come from the
 * role's evaluation criteria; responsibilities provide context.
 */
export default function RoleReviewSection({
  shareId,
  candidateName,
  evidence,
}: {
  shareId: string;
  candidateName: string;
  evidence: PassportEvidence[];
}) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employer/roles")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setRoles(d.roles);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = roles.find((r) => r.id === selectedRoleId);
  // Requirements = evaluation criteria; fall back to responsibilities if empty.
  const requirements =
    selected && selected.evaluation_criteria.length > 0
      ? selected.evaluation_criteria
      : selected?.responsibilities ?? [];

  if (loading) {
    return (
      <div style={{ padding: 16, color: "var(--ink-secondary)", fontSize: 14 }}>
        Loading roles…
      </div>
    );
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px" }}>
        Review against role requirements
      </h2>
      <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 16px" }}>
        Select a role to map its requirements to this candidate&apos;s evidence.
      </p>

      {roles.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--control-border)",
            borderRadius: "var(--radius-control)",
            padding: 20,
            fontSize: 14,
          }}
        >
          <p style={{ margin: "0 0 8px", fontWeight: 500 }}>No roles yet</p>
          <p style={{ margin: 0, color: "var(--ink-secondary)", fontSize: 13 }}>
            Create a role with evaluation criteria first, then return here to review evidence against it.
          </p>
          <a
            href="/app/employer/roles"
            style={{ fontSize: 13, color: "var(--action)", display: "inline-block", marginTop: 8 }}
          >
            Go to roles →
          </a>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id === selectedRoleId ? null : r.id)}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-tag)",
                  border: `1px solid ${r.id === selectedRoleId ? "var(--action)" : "var(--border)"}`,
                  background: r.id === selectedRoleId ? "var(--action-tint)" : "var(--surface)",
                  color: r.id === selectedRoleId ? "var(--action-hover)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {r.title}
              </button>
            ))}
          </div>

          {selected && requirements.length > 0 && (
            <RequirementEvidenceReview
              roleId={selected.id}
              shareId={shareId}
              roleTitle={selected.title}
              requirements={requirements}
              evidence={evidence}
              candidateName={candidateName}
            />
          )}

          {selected && requirements.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
              This role has no evaluation criteria or responsibilities yet. Edit the role to add them.
            </p>
          )}
        </>
      )}
    </section>
  );
}
