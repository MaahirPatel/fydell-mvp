"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check } from "lucide-react";

type Finding = {
  id: string;
  dimension: string;
  observation: string;
  interpretation: string | null;
  confidence: string;
  limitation: string | null;
};

type Permission = {
  id: string;
  recipientOrganizationId: string | null;
  recipientUserId: string | null;
  purpose: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
};

type Receipt = {
  id: string;
  receipt_number: string;
  status: string;
  context_summary: string | null;
  evidence_summary: string | null;
  limitations: string | null;
  issued_at: string | null;
};

export default function FdeReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/fde/receipts/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load receipt");
      setReceipt(data.receipt);
      setFindings(data.findings || []);
      setPermissions(data.permissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load receipt");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fde/receipts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", purpose: "hiring_review" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not share receipt");
      setShareUrl(data.shareUrl);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share receipt");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(permissionId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fde/receipts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", permissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not revoke access");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke access");
    } finally {
      setBusy(false);
    }
  }

  if (error && !receipt) {
    return <p className="text-[14px] text-[#fda4b0]">{error}</p>;
  }
  if (!receipt) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-32 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Receipt</p>
      <h1 className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[30px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
        {receipt.receipt_number}
      </h1>
      {receipt.context_summary && <p className="mt-2 text-[14px] text-white/60">{receipt.context_summary}</p>}

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Evidence findings</h2>
        {findings.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-white/50">No findings recorded.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {findings.map((f) => (
              <li key={f.id} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-semibold capitalize text-white">
                    {f.dimension.replace(/_/g, " ")}
                  </h3>
                  <span className="text-[11px] text-white/40">{f.confidence} confidence</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.observation}</p>
                {f.interpretation && <p className="mt-1 text-[13px] leading-relaxed text-white/55">{f.interpretation}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Sharing</h2>
          <button
            type="button"
            disabled={busy}
            onClick={share}
            className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            Create share link
          </button>
        </div>

        {shareUrl && (
          <div className="mt-4 space-y-2">
            <p className="text-[12.5px] text-white/60">Share this link. It won&apos;t be shown again.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 break-all rounded-[10px] border border-white/10 bg-black/30 px-3 py-2 text-[12px]">
                {typeof window !== "undefined" ? `${window.location.origin}${shareUrl}` : shareUrl}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/15 px-3 text-[12px]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-[13px] text-[#fda4b0]">{error}</p>}

        {permissions.length > 0 && (
          <ul className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {permissions.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
                <div>
                  <p className="text-white/80">{p.purpose.replace(/_/g, " ")}</p>
                  <p className="text-white/40">
                    {p.accessCount} view(s) · granted {new Date(p.grantedAt).toLocaleDateString()}
                  </p>
                </div>
                {p.revokedAt ? (
                  <span className="text-white/40">Revoked</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revoke(p.id)}
                    className="text-[12px] text-[#fda4b0] hover:underline disabled:opacity-50"
                  >
                    Revoke
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
