"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGE_LABEL, type ApplicationStage } from "@/lib/hiring/role-contract";
import { send } from "./send";

export default function StageSelect({ applicationId, stage, applicantName }: { applicationId: string; stage: ApplicationStage; applicantName: string }) {
  const router = useRouter();
  const [value, setValue] = useState(stage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: ApplicationStage) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError(null);
    const result = await send<{ ok: true }>(`/api/hiring/applications/${applicationId}`, "POST", { stage: next });
    setBusy(false);
    if ("error" in result) {
      setValue(previous);
      return setError(result.error);
    }
    router.refresh();
  }

  return (
    <div>
      <select
        aria-label={`Stage for ${applicantName}`}
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as ApplicationStage)}
        className="platform-select h-8 min-w-[10rem] text-app-meta"
      >
        {(Object.keys(STAGE_LABEL) as ApplicationStage[]).map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      {error ? <p role="alert" className="mt-1 text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
    </div>
  );
}
