import "server-only";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { withNext } from "@/lib/auth/safe-next";

/** The signed-in user for a demo page; anyone else goes to sign in and comes back to the same page. */
export async function requireDemoUser(path: string): Promise<{ id: string; email: string }> {
  const user = await getAuthenticatedUser();
  if (!user) redirect(withNext("/login", path));
  return { id: user.id, email: user.email ?? "" };
}
