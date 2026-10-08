import DemoWorkspace from "@/components/sandbox/demo/task/TaskWorkspace";
import { scenarioFromParams, scenarioMetadata, type ScenarioParams } from "../scenario-route";

export function generateMetadata(props: ScenarioParams) {
  return scenarioMetadata(props, "demo workspace");
}

export default async function ScenarioWorkspacePage(props: ScenarioParams) {
  const scenario = await scenarioFromParams(props);
  return <DemoWorkspace scenarioKey={scenario.key} />;
}
