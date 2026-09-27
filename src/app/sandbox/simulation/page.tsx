import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SandboxSimulationPage() {
  redirect("/sandbox/work");
}
