import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { DEMO_HOME, isDemoDestination } from "@/lib/employer-demo/fixtures";

export const metadata = {
  title: "Employer sandbox",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * The one way into the employer sandbox. Signed-in visitors go straight to the
 * demo workspace; everyone else signs in or creates an employer account first
 * and then lands on the page they asked for. Old public demo URLs redirect here
 * with their equivalent destination.
 */
export default async function DemoEntryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const destination = isDemoDestination(requested) ? requested : DEMO_HOME;
  const user = await getAuthenticatedUser();
  if (user) redirect(destination);
  redirect(`/signup?as=employer&intent=demo&next=${encodeURIComponent(destination)}`);
}
