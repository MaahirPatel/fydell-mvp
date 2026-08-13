import { redirect } from "next/navigation";

/** Legacy alias. Evaluations are published by Fydell, not built by employers. */
export default function SimulationsNewAliasPage() {
  redirect("/app/employer/assessments");
}
