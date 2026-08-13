import { redirect } from "next/navigation";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await params;
  redirect("/simulations");
}
