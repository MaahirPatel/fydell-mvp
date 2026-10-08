import { YourReportPage } from "@/components/sandbox/demo/ReportView";
import { scenarioFromParams, scenarioMetadata, type ScenarioParams } from "../scenario-route";

export function generateMetadata(props: ScenarioParams) {
  return scenarioMetadata(props, "your demo report");
}

export default async function ScenarioReportPage(props: ScenarioParams) {
  const scenario = await scenarioFromParams(props);
  return <YourReportPage scenarioKey={scenario.key} />;
}
