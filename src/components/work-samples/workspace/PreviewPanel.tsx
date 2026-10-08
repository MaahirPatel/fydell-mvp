"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { SkeletonText } from "@/components/ui/Skeleton";
import { api } from "../api";
import { CandidatePreview } from "../candidate";
import { Banner } from "../ui";
import type { ScenarioPackage } from "../types";

type Loaded = { package: ScenarioPackage; packageSha256: string; revision: number };

/**
 * Loads GET /preview, which records that this person opened this exact
 * version. Approval requires it.
 */
export function PreviewPanel({
  draftId,
  currentSha,
  beforeLoad,
  onLoaded,
}: {
  draftId: string;
  currentSha: string | null;
  /** Saves pending edits so the preview reflects them. */
  beforeLoad: () => Promise<void>;
  onLoaded: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await beforeLoad();
      const res = await api<Loaded>(`/api/eng/authoring/drafts/${draftId}/preview`);
      if (cancelled) return;
      if (res.ok) {
        setLoaded(res.data);
        setError(null);
        onLoaded();
      } else {
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reload only on explicit request; callbacks change identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, nonce]);

  const outdated = loaded && currentSha && loaded.packageSha256 !== currentSha;

  return (
    <Panel>
      <PanelSection
        title="Candidate preview"
        description="Candidate preview: exactly what candidates receive. Evaluation tests and reference solutions are not included."
        action={
          <Button variant="secondary" size="sm" onClick={() => setNonce((n) => n + 1)}>
            Reload preview
          </Button>
        }
      >
        {error ? (
          <Banner tone="bad" role="alert">
            {error}
          </Banner>
        ) : null}
        {outdated ? (
          <Banner tone="warn" className="mb-4">
            The draft changed after this preview loaded. Reload the preview before approving.
          </Banner>
        ) : null}
        {loaded ? <CandidatePreview pkg={loaded.package} /> : error ? null : <SkeletonText lines={8} />}
      </PanelSection>
    </Panel>
  );
}

export default PreviewPanel;
