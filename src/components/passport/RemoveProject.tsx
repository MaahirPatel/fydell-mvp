"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { RemovalImpact } from "@/lib/passport/store";

export default function RemoveProject({ repoFullName, uploaded, versionCount, impact }: { repoFullName: string; uploaded: boolean; versionCount: number; impact: RemovalImpact }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reach = impact.shares.length + impact.applications.length;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/passport/projects?repo=${encodeURIComponent(repoFullName)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "The project was not removed. Try again.");
        setBusy(false);
        return;
      }
      router.push("/app/candidate/work-record?removed=1");
      router.refresh();
    } catch {
      setError("Couldn't reach Fydell. The project was not removed.");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="remove-heading" className="mt-12 border-t border-[var(--border-subtle)] pt-6">
      <h2 id="remove-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">
        Remove this project
      </h2>
      <p className="mt-1 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        Deletes {versionCount === 1 ? "this report and its findings" : `all ${versionCount} versions of this report and their findings`} from Fydell. {uploaded ? "The files on your computer are not touched." : "Your repository on GitHub is not touched."}
      </p>

      {!confirming ? (
        <Button variant="quiet" size="sm" className="mt-3" onClick={() => setConfirming(true)}>
          Remove project…
        </Button>
      ) : (
        <div className="mt-4 max-w-[68ch] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
          {reach ? (
            <>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Removing it also takes it out of:</p>
              <ul className="mt-2 space-y-1 text-[14px] text-[var(--text-secondary)]">
                {impact.applications.map((a) => (
                  <li key={a.id} className="list-inside list-disc">
                    Your application to {a.organizationName} for {a.roleTitle}
                  </li>
                ))}
                {impact.shares.map((s) => (
                  <li key={s.id} className="list-inside list-disc">
                    Share link “{s.label}”
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[14px] text-[var(--text-primary)]">No active share link or open application shows this project.</p>
          )}
          <p className="mt-3 text-[13px] leading-[1.5] text-[var(--text-tertiary)]">
            Employers keep notes and decisions they already recorded, and copies they already downloaded. This can&apos;t be undone; {uploaded ? "you can upload the project again later." : "you can import the repository again later."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" onClick={remove} loading={busy}>
              Remove {repoFullName}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              Keep it
            </Button>
          </div>
          <FormError>{error}</FormError>
        </div>
      )}
    </section>
  );
}
