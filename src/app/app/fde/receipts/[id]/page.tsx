"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy } from "lucide-react";

type Permission = {
  id: string;
  purpose: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  hasToken: boolean;
};

type Finding = {
  id: string;
  dimension: string;
  observation: string;
  interpretation: string;
  confidence: string;
  limitation: string | null;
};

type ReceiptDetail = {
  receipt: {
    id: string;
    receipt_number: string;
    status: string;
    context_summary: string | null;
    evidence_summary: string | null;
    limitations: string | null;
    issued_at: string | null;
  };
  findings: Finding[];
  permissions: Permission[];
};

export default function FdeReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/fde/receipts/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load receipt");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load receipt");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function share() {
    setShareBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fde/receipts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", purpose: "hiring_review" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create share link");
      setShareUrl(`${window.location.origin}${json.shareUrl}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create share link");
    } finally {
      setShareBusy(false);
    }
  }

  async function revoke(permissionId: string) {
    if (!window.confirm("Revoke this share link? Anyone holding it will lose access.")) return;
    setRevokingId(permissionId);
    setError(null);
    try {
      const res = await fetch(`/api/fde/receipts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", permissionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not revoke");
      setShareUrl(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke");
    } finally {
      setRevokingId(null);
    }
  }

  if (error && !data) {
    return (
      <div>
        <p className="text-[14px] text-[#fda4b0]">{error}</p>
        <Link href="/app/fde/receipts" className="mt-3 inline-block text-[13px] text-white/60 underline">
          ← Back to receipts
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-32 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  const activePermissions = data.permissions.filter((p) => !p.revokedAt);

  return (
    <div className="mx-auto max-w-[720px]">
      <Link href="/app/fde/receipts" className="text-[13px] text-white/50 hover:text-white">
        ← All receipts
      </Link>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Your credential · candidate-owned
      </p>
      <h1
        className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[30px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        {data.receipt.receipt_number}
      </h1>
      <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed text-white/55">
        This work receipt belongs to you, not to the employer who invited you. It survives the
        original hiring process — it stays private until you create a share link, and you can
        revoke any link at any time.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-[13px] text-[#fda4b0]">
          {error}
        </p>
      )}

      {data.receipt.context_summary && (
        <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Context</h2>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/75">
            {data.receipt.context_summary}
          </p>
        </section>
      )}

      <section className="mt-4 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Evidence findings ({data.findings.length})
        </h2>
        {data.findings.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-white/50">No findings recorded for this session.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {data.findings.map((f) => (
              <li key={f.id} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-semibold capitalize text-white">
                    {f.dimension.replace(/_/g, " ")}
                  </h3>
                  <span className="text-[11px] capitalize text-white/40">{f.confidence} confidence</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.observation}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/55">{f.interpretation}</p>
                {f.limitation && (
                  <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                    Limitation: {f.limitation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Sharing</h2>
        <p className="mt-1.5 text-[13px] text-white/50">
          {activePermissions.length === 0
            ? "Private — nobody can see this receipt right now."
            : `${activePermissions.length} active share link${activePermissions.length > 1 ? "s" : ""}.`}
        </p>

        {shareUrl && (
          <div className="mt-3 space-y-2">
            <p className="text-[12.5px] text-[#67d9a0]">
              Share link created. Copy it now — it won&apos;t be shown again.
            </p>
            <div className="break-all rounded-[10px] border border-white/10 bg-black/30 px-3 py-2 text-[12px]">
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/15 px-3 text-[12px]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={shareBusy || data.receipt.status !== "issued"}
          onClick={() => void share()}
          className="mt-4 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
        >
          {shareBusy ? "Creating link…" : "Create share link"}
        </button>
        {data.receipt.status !== "issued" && (
          <p className="mt-2 text-[12px] text-white/40">
            Only issued receipts can be shared (current status: {data.receipt.status}).
          </p>
        )}

        {data.permissions.length > 0 && (
          <ul className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {data.permissions.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[12.5px]">
                <span className="text-white/70">
                  {p.purpose.replace(/_/g, " ")} · created {new Date(p.grantedAt).toLocaleDateString()}
                  {p.accessCount > 0 ? ` · opened ${p.accessCount}×` : " · never opened"}
                </span>
                {p.revokedAt ? (
                  <span className="text-white/35">Revoked</span>
                ) : (
                  <button
                    type="button"
                    disabled={revokingId === p.id}
                    onClick={() => void revoke(p.id)}
                    className="text-[12px] text-[#fda4b0] underline disabled:opacity-50"
                  >
                    {revokingId === p.id ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
