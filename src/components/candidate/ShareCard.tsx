"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { ShareField } from "@/lib/passport/view";
import e from "./easy.module.css";

type Share = { id: string; label: string; fields: ShareField[]; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastAccessedAt: string | null };

const FIELD_LABEL: Record<ShareField, string> = {
  projects: "Your projects and your own words about them",
  evidence: "The findings, with links to the code",
  capabilities: "The short summary at the top",
  roles: "Roles it fits, and what is missing",
};

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * "Who can see it": one row per link with a plain on/off state, and one form
 * to make a new link. Same API as the profile's sharing panel.
 */
export default function ShareCard({ initialShares }: { initialShares: Share[] }) {
  const [shares, setShares] = useState(initialShares);
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<ShareField[]>(["projects", "evidence", "roles", "capabilities"]);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, fields }),
      });
      const data = (await res.json()) as { url?: string; shares?: Share[]; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "The link could not be made. Try again.");
        return;
      }
      setCreated(data.url);
      setCopied(false);
      setShares(data.shares ?? shares);
      setLabel("");
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/passport/shares/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { shares?: Share[]; error?: string };
      if (!res.ok) return setError(data.error ?? "The link could not be turned off. Try again.");
      setShares(data.shares ?? shares);
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    }
  }

  // One clock per mount: link expiry is read in days, so a stale second never matters.
  const [now] = useState(() => Date.now());
  const isOn = (s: Share) => !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt).getTime() > now);

  return (
    <section id="share" aria-labelledby="share-title" className={cx(e.card, e.cardFocus, e.cardTight)} style={{ scrollMarginTop: 110 }}>
      <h2 id="share-title" className={e.h3}>
        Who can see it
      </h2>
      <p className={e.small}>
        Each employer gets their own link. Turning a link off stops new views. It cannot take back a copy someone already saved.
      </p>

      {shares.length === 0 ? <p className={e.small}>No links yet. Only you can see your passport.</p> : null}

      {shares.map((s) => (
        <div key={s.id} className={e.shareItem}>
          <div className={e.shareWho}>
            <strong>{s.label || "Link without a name"}</strong>
            {isOn(s) ? (
              <span className={e.on}>
                Link on{s.expiresAt ? ` · ends ${day(s.expiresAt)}` : ""}
                {s.lastAccessedAt ? ` · opened ${day(s.lastAccessedAt)}` : " · not opened yet"}
              </span>
            ) : (
              <span className={e.off}>Link off</span>
            )}
          </div>
          {isOn(s) ? (
            <button type="button" onClick={() => void turnOff(s.id)} className={cx(e.btn, e.btnSmall)} aria-label={`Turn off the link for ${s.label || "this employer"}`}>
              Turn off
            </button>
          ) : null}
        </div>
      ))}

      {created ? (
        <div className={e.newLink} role="status">
          <p>
            <strong>Your new link is ready.</strong> Copy it now. For your safety we only show it once.
          </p>
          <code>{created}</code>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(created).then(() => setCopied(true))}
            className={cx(e.btn, e.btnSmall)}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Copied" : "Copy the link"}
          </button>
        </div>
      ) : null}

      <form onSubmit={create} className={e.section}>
        <div className={e.field}>
          <label htmlFor="share-label" className={e.label}>
            Who is this link for?
          </label>
          <input
            id="share-label"
            value={label}
            onChange={(ev) => setLabel(ev.target.value)}
            maxLength={80}
            placeholder="For example: the team at Acme"
            className={e.input}
            style={{ height: 52, fontSize: 18 }}
          />
        </div>
        <details className={e.disclosure}>
          <summary>Choose what they see</summary>
          <div>
            {(Object.keys(FIELD_LABEL) as ShareField[]).map((f) => (
              <label key={f} className={e.checkRow}>
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  disabled={f === "projects"}
                  onChange={() => setFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                />
                {FIELD_LABEL[f]}
              </label>
            ))}
          </div>
        </details>
        {error ? (
          <p role="alert" className={cx(e.status, e.statusBad)} style={{ fontSize: 16 }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className={cx(e.btn, e.btnPrimary, e.btnBlock)}>
          {busy ? "Making the link…" : "Make a new share link"}
        </button>
      </form>
    </section>
  );
}
