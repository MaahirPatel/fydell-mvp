import { ExampleEmployerViewPage } from "@/components/sandbox/demo/ReviewDemo";
import { scenarioFromParams, scenarioMetadata, type ScenarioParams } from "../../scenario-route";

export function generateMetadata(props: ScenarioParams) {
  return scenarioMetadata(props, "example review");
}

export default async function ScenarioExampleReviewPage(props: ScenarioParams) {
  const scenario = await scenarioFromParams(props);
  return <ExampleEmployerViewPage scenarioKey={scenario.key} />;
}
