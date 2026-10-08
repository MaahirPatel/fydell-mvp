import { EmployerViewPage } from "@/components/sandbox/demo/ReviewDemo";
import { scenarioFromParams, scenarioMetadata, type ScenarioParams } from "../scenario-route";

export function generateMetadata(props: ScenarioParams) {
  return scenarioMetadata(props, "employer view");
}

export default async function ScenarioReviewPage(props: ScenarioParams) {
  const scenario = await scenarioFromParams(props);
  return <EmployerViewPage scenarioKey={scenario.key} />;
}
