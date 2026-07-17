"use client";

import { useCallback, useEffect, useState } from "react";

type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };

type SignedRelease = { releaseId: string; contentHash: string; signedBy: string; signedAt: string };

type VariantRow = {
  spec: {
    id: string;
    seed: string;
    title: string;
    difficulty: string;
    defectFocus: string;
    status: string;
    curveballText: string;
  };
  effectiveStatus: "draft" | "approved" | "rejected" | "retired";
  fileCount: number;
  validation: ValidationResult;
  lastValidatedAt: string | null;
  signedReleases: SignedRelease[];
  updatedBy: string | null;
  updatedAt: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-[#10331f] text-[#7fe0a4]",
  rejected: "bg-[#3a1420] text-[#fda4b0]",
  retired: "bg-[#28242c] text-white/50",
  draft: "bg-[#28242c] text-white/60",
};

export default function OpsVariantsList() {
  const [variants, setVariants] = useState<VariantRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [knownGoodReleaseId, setKnownGoodReleaseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/variants", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load variants");
      setVariants(data.variants || []);
      setKnownGoodReleaseId(data.knownGoodReleaseId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load variants");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "retire" | "revalidate" | "sign_release") {
    setBusyId(`${id}:${action}`);
    setError(null);
    try {
      const res = await fetch(`/api/ops/variants/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Could not ${action.replace("_", " ")}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action.replace("_", " ")}`);
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-[13px] text-[#fda4b0]">{error}</p>;
  if (variants === null) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-24 rounded-[12px] bg-white/5" />
        <div className="h-24 rounded-[12px] bg-white/5" />
        <div className="h-24 rounded-[12px] bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {knownGoodReleaseId && (
        <p className="text-[12px] text-white/40">
          Known-good fallback release: <code className="text-white/60">{knownGoodReleaseId}</code>
        </p>
      )}
      <ul className="space-y-4">
        {variants.map((v) => {
          const busyPrefix = `${v.spec.id}:`;
          const isBusy = (action: string) => busyId === `${busyPrefix}${action}`;
          const anyBusy = busyId?.startsWith(busyPrefix) ?? false;
          const latestSigned = v.signedReleases[v.signedReleases.length - 1] || null;

          return (
            <li
              key={v.spec.id}
              className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 px-5 py-4 text-[13px]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{v.spec.title}</p>
                  <p className="mt-0.5 text-white/45">
                    id <code>{v.spec.id}</code> · seed <code>{v.spec.seed}</code> · difficulty{" "}
                    {v.spec.difficulty} · defect focus <code>{v.spec.defectFocus}</code> ·{" "}
                    {v.fileCount} files
                  </p>
                </div>
                <span
                  className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide ${
                    STATUS_STYLES[v.effectiveStatus] || STATUS_STYLES.draft
                  }`}
                >
                  {v.effectiveStatus}
                </span>
              </div>

              <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-3.5 py-3">
                <p className={`text-[12.5px] font-medium ${v.validation.ok ? "text-[#7fe0a4]" : "text-[#fda4b0]"}`}>
                  {v.validation.ok ? "Validation passed" : "Validation failed"}
                </p>
                {v.validation.errors.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12px] text-[#fda4b0]">
                    {v.validation.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                {v.validation.warnings.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-[12px] text-[#e8c07a]">
                    {v.validation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
                {v.lastValidatedAt && (
                  <p className="mt-1.5 text-[11px] text-white/35">
                    Last re-validated {new Date(v.lastValidatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {latestSigned && (
                <p className="mt-2 text-[11.5px] text-white/40">
                  Last signed release <code className="text-white/60">{latestSigned.releaseId}</code> by{" "}
                  {latestSigned.signedBy} at {new Date(latestSigned.signedAt).toLocaleString()}
                </p>
              )}
              {v.updatedBy && v.updatedAt && (
                <p className="mt-1 text-[11.5px] text-white/35">
                  Status last set by {v.updatedBy} at {new Date(v.updatedAt).toLocaleString()}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={anyBusy}
                  onClick={() => act(v.spec.id, "revalidate")}
                  className="inline-flex h-8 items-center rounded-[8px] border border-white/15 px-3 text-[12px] font-medium text-white/80 disabled:opacity-50"
                >
                  {isBusy("revalidate") ? "Re-validating…" : "Re-validate"}
                </button>
                <button
                  type="button"
                  disabled={anyBusy || v.effectiveStatus === "approved"}
                  onClick={() => act(v.spec.id, "approve")}
                  className="inline-flex h-8 items-center rounded-[8px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C] disabled:opacity-50"
                >
                  {isBusy("approve") ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={anyBusy || v.effectiveStatus === "rejected"}
                  onClick={() => act(v.spec.id, "reject")}
                  className="inline-flex h-8 items-center rounded-[8px] border border-[#fda4b0]/40 px-3 text-[12px] font-medium text-[#fda4b0] disabled:opacity-50"
                >
                  {isBusy("reject") ? "Rejecting…" : "Reject"}
                </button>
                <button
                  type="button"
                  disabled={anyBusy || v.effectiveStatus === "retired"}
                  onClick={() => act(v.spec.id, "retire")}
                  className="inline-flex h-8 items-center rounded-[8px] border border-white/15 px-3 text-[12px] font-medium text-white/60 disabled:opacity-50"
                >
                  {isBusy("retire") ? "Retiring…" : "Retire"}
                </button>
                <button
                  type="button"
                  disabled={anyBusy || v.effectiveStatus !== "approved" || !v.validation.ok}
                  onClick={() => act(v.spec.id, "sign_release")}
                  className="inline-flex h-8 items-center rounded-[8px] bg-[#3c6df0] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {isBusy("sign_release") ? "Signing…" : "Sign release"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
