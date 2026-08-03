import { redirect } from "next/navigation";

export const metadata = { title: "Candidates | Fydell" };

/** Alias → employer candidates. */
export default function CandidatesAliasPage() {
  redirect("/app/employer/candidates");
}
