import { redirect } from "next/navigation";

export const metadata = { title: "New simulation | Fydell" };

/** Alias → guided builder under the employer shell. */
export default function SimulationsNewAliasPage() {
  redirect("/app/employer/simulations/new");
}
