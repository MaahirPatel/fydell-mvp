import { getSimulation } from "@/lib/platform-store";
import { notFound } from "next/navigation";
import ImmersiveWorkstation from "@/components/platform/ImmersiveWorkstation";

export default async function SessionPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kiosk?: string }>;
}) {
  const { id } = await params;
  const { kiosk } = await searchParams;
  const simulation = await getSimulation(id);
  if (!simulation) notFound();

  return <ImmersiveWorkstation simulation={simulation} kiosk={kiosk === "1"} />;
}
