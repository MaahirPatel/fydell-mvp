import { ExampleReportPage } from "@/components/sandbox/demo/ReportView";
import { scenarioFromParams, scenarioMetadata, type ScenarioParams } from "../scenario-route";

export function generateMetadata(props: ScenarioParams) {
  return scenarioMetadata(props, "example report");
}

export default async function ScenarioExamplePage(props: ScenarioParams) {
  const scenario = await scenarioFromParams(props);
  return <ExampleReportPage scenarioKey={scenario.key} />;
}
