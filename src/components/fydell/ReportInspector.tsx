"use client";

/**
 * The employer's evidence inspector.
 *
 * This is the answer to "what do I actually receive?", so it leads with the
 * candidate's conclusion and makes each claim openable rather than leading with
 * a single score. Selecting a claim shows the candidate action behind it, the
 * source lines it cites, and where the claim stops.
 *
 * Limitations are given the same weight as claims on purpose. A report that
 * only shows what a candidate got right is a sales asset, not evidence.
 */
import { useState } from "react";
import { CitationLink, CitationSource } from "./CitationLink";
import type { Citation } from "./CitationLink";
import {
  CITATION_SOURCES,
  CITATIONS,
  NORTHLINE_CLAIMS,
  NORTHLINE_CONCLUSION,
} from "@/lib/fixtures/northline";

function sourceLinesFor(citation: Citation) {
  const key = (Object.keys(CITATIONS) as (keyof typeof CITATIONS)[]).find(
    (k) =>
      CITATIONS[k].source === citation.source &&
      CITATIONS[k].locator === citation.locator
  );
  return key ? CITATION_SOURCES[key] : [];
}

export function ReportInspector({
  /** Trims to the first N claims so the scene fits a hero without scrolling. */
  limit,
  className = "",
}: {
  limit?: number;
  className?: string;
}) {
  const claims = limit ? NORTHLINE_CLAIMS.slice(0, limit) : NORTHLINE_CLAIMS;
  const [openId, setOpenId] = useState<string>(claims[0].id);
  const open = claims.find((c) => c.id === openId) ?? claims[0];
  const [citation, setCitation] = useState<Citation>(open.citations[0]);

  function selectClaim(id: string) {
    const next = claims.find((c) => c.id === id);
    if (!next) return;
    setOpenId(id);
    setCitation(next.citations[0]);
  }

  return (
    <div className={className}>
      <div className="px-4 py-3.5">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Candidate conclusion
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--text-primary)]">
          {NORTHLINE_CONCLUSION}
        </p>
      </div>

      <div className="grid border-t border-[var(--border-subtle)] lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="border-b border-[var(--border-subtle)] p-2 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-[var(--text-tertiary)]">
            Claims. Select one to open its evidence.
          </p>
          <ul className="space-y-0.5">
            {claims.map((claim) => {
              const isOpen = claim.id === open.id;
              return (
                <li key={claim.id}>
                  <button
                    type="button"
                    onClick={() => selectClaim(claim.id)}
                    aria-pressed={isOpen}
                    className={`relative w-full rounded-[var(--radius-control)] py-2 pl-3 pr-2.5 text-left transition-colors ${
                      isOpen
                        ? "bg-[var(--surface-hover)]"
                        : "hover:bg-[rgba(255,255,255,0.045)]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-y-1.5 left-0 w-[2px] rounded-full ${
                        isOpen
                          ? claim.tone === "risk"
                            ? "bg-[var(--fydell-risk)]"
                            : "bg-[var(--fydell-evidence)]"
                          : "bg-transparent"
                      }`}
                    />
                    <span
                      className={`block text-[12.5px] leading-[1.45] ${
                        isOpen
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {claim.text}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {claim.citations.map((c) => (
                        <span
                          key={`${c.source}-${c.locator}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]"
                        >
                          <CitationLink citation={c} />
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-3">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            How the candidate got there
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--text-secondary)]">
            {open.action}
          </p>

          <p className="mt-4 text-[11px] font-medium text-[var(--text-tertiary)]">
            Cited source
          </p>
          <div className="mt-1.5 space-y-1">
            {open.citations.map((c) => (
              <CitationLink
                key={`${c.source}-${c.locator}`}
                citation={c}
                selected={
                  c.source === citation.source && c.locator === citation.locator
                }
                onSelect={setCitation}
              />
            ))}
          </div>
          <div className="mt-2">
            <CitationSource citation={citation} lines={sourceLinesFor(citation)} />
          </div>

          {open.limitation ? (
            <>
              <p className="mt-4 text-[11px] font-medium text-[var(--text-tertiary)]">
                Where this claim stops
              </p>
              <p className="mt-1 border-l-2 border-[var(--fydell-risk)] pl-2 text-[11.5px] leading-[1.5] text-[var(--text-secondary)]">
                {open.limitation}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
