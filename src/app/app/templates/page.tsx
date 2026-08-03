import { redirect } from "next/navigation";

export const metadata = { title: "Templates | Fydell" };

/** Alias → employer simulation library. */
export default function TemplatesAliasPage() {
  redirect("/app/employer/assessments");
}
