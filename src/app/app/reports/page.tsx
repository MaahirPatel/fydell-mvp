import { redirect } from "next/navigation";

export const metadata = { title: "Reports | Fydell" };

/** Alias → employer reports. */
export default function ReportsAliasPage() {
  redirect("/app/employer/reports");
}
