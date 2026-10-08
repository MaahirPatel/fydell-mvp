import type { ScenarioPackage } from "@/lib/eng/authoring/package";
import { CandidateFileBrowser } from "./CandidateFileBrowser";
import {
  CandidateAcceptanceCriteria,
  CandidateAccommodations,
  CandidateAiPolicy,
  CandidateBrief,
  CandidateCoworkers,
  CandidateInterface,
  CandidateSection,
  CandidateSetup,
  CandidateSubmission,
  CandidateTime,
} from "./parts";

/** Everything a candidate receives for one work sample, in reading order. */
export function CandidatePreview({ pkg }: { pkg: ScenarioPackage }) {
  return (
    <div className="grid gap-8">
      <CandidateBrief pkg={pkg} />
      <CandidateInterface pkg={pkg} />
      <CandidateAcceptanceCriteria pkg={pkg} />
      <CandidateTime pkg={pkg} />
      <CandidateSetup pkg={pkg} />
      <CandidateSection title="Starter project">
        <CandidateFileBrowser pkg={pkg} />
      </CandidateSection>
      <CandidateAiPolicy pkg={pkg} />
      <CandidateCoworkers pkg={pkg} />
      <CandidateSubmission pkg={pkg} />
      <CandidateAccommodations pkg={pkg} />
    </div>
  );
}

export default CandidatePreview;
