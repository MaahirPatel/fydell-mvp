"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { StatusTag } from "@/components/ui/StatusTag";
import { Surface } from "@/components/ui/Surface";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";

interface CompareRow {
  sessionId: string;
  candidate: string;
  reportStatus: string;
  performance: number | null;
  coverage: number | null;
  confidence: number | null;
  band: string | null;
  strengths: string[];
  counterevidence: string[];
  humanReviewRequired: boolean;
}

function percent(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

export default function CompareClient() {
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/pilot/compare")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRows(data.candidates || []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load the comparison")
      );
  }, []);

  if (error) {
    return <EmptyState title="Could not load the comparison" description={error} />;
  }

  if (rows === null) {
    return (
      <Surface tone="panel" className="p-4">
        <SkeletonTable rows={3} cols={5} />
      </Surface>
    );
  }

  if (rows.length < 2) {
    return (
      <EmptyState
        title="Not enough reports to compare"
        description="Comparison needs at least two completed reports on the same evaluation version, so the two candidates were given the same work."
        action={
          <ButtonLink href="/app/employer/reports" variant="secondary" size="sm">
            Go to reports
          </ButtonLink>
        }
      />
    );
  }

  return (
    <Surface tone="panel" className="overflow-hidden">
      <Table className="min-w-[900px]">
        <THead>
          <TH>Candidate</TH>
          <TH align="right">Score</TH>
          <TH align="right">Coverage</TH>
          <TH align="right">Confidence</TH>
          <TH>What they established</TH>
          <TH>What they missed</TH>
          <TH align="right">Report</TH>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.sessionId} className="align-top">
              <TDPrimary>
                <span className="block">{r.candidate}</span>
                {r.humanReviewRequired ? (
                  <StatusTag tone="changed" className="mt-1.5">
                    Needs review
                  </StatusTag>
                ) : null}
              </TDPrimary>
              <TD align="right" className="tabular-nums text-[var(--text-primary)]">
                {r.performance === null ? (
                  <span className="text-[var(--text-tertiary)]">Insufficient</span>
                ) : (
                  <>
                    {r.performance}
                    {r.band ? (
                      <span className="mt-0.5 block text-[12px] font-normal text-[var(--text-tertiary)]">
                        {r.band}
                      </span>
                    ) : null}
                  </>
                )}
              </TD>
              <TD align="right" className="tabular-nums">
                {percent(r.coverage)}
              </TD>
              <TD align="right" className="tabular-nums">
                {percent(r.confidence)}
              </TD>
              <TD>
                <ul className="space-y-1">
                  {r.strengths.slice(0, 2).map((s, i) => (
                    <li key={i} className="max-w-[34ch] leading-[1.55]">
                      {s}
                    </li>
                  ))}
                </ul>
              </TD>
              <TD>
                <ul className="space-y-1">
                  {r.counterevidence.slice(0, 2).map((s, i) => (
                    <li key={i} className="max-w-[34ch] leading-[1.55]">
                      {s}
                    </li>
                  ))}
                </ul>
              </TD>
              <TD align="right">
                <Link
                  href={`/app/employer/assessments/report/${r.sessionId}`}
                  className="inline-flex h-8 items-center rounded-[var(--radius-control)] px-2.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Open
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Surface>
  );
}
