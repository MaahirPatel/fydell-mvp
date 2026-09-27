import { redirect } from "next/navigation";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function EmployerReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ review?: string }>;
}) {
  const params = (await searchParams) || {};
  redirect(params.review === "needs" ? "/app/employer/evidence?review=needs" : "/app/employer/evidence");
}
