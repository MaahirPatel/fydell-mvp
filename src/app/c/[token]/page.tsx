import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy candidate invite path. Always send candidates to the Meridian workroom,
 * which supports both Supabase and the local MVP store.
 */
export default async function CandidatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/workroom/${token}`);
}
