import { redirect } from "next/navigation";

/**
 * The standalone passport page is retired: the passport is now a section of
 * the unified engineering profile.
 */
export default function CandidatePassportRedirect() {
  redirect("/app/candidate/work-record");
}
