import { ProductStage, StageDescription } from "@/components/fydell/ProductStage";
import { ReportInspector } from "@/components/fydell/ReportInspector";
import { NORTHLINE_SCENARIO } from "@/lib/fixtures/northline";

/**
 * The right half of the first viewport: what the employer actually receives.
 *
 * All three claims are shown. The third is the one that survives the
 * correction, and it is the reason the report is worth reading, so cutting it
 * to save height would remove the point of the scene.
 */
export default function HeroEvidenceScene() {
  return (
    <ProductStage
      title="Evidence report"
      source={`${NORTHLINE_SCENARIO.company} · synthetic`}
      label="Employer evidence report showing a candidate conclusion with openable claims"
      meta={<span>Review required</span>}
    >
      <ReportInspector />
      <StageDescription>
        An employer report for the Operations performance investigation. It
        opens with the candidate&apos;s conclusion, lists the claims that support
        it, and shows the cited rows of the source file behind the selected
        claim along with the limits of that claim.
      </StageDescription>
    </ProductStage>
  );
}
