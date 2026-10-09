import DemoTaskPerspective from "@/components/employer/demo/DemoTaskPerspective";
import { DEMO_HOME, DEMO_TASK_PATH } from "@/lib/employer-demo/fixtures";
import { requireDemoUser } from "@/lib/employer-demo/session";

export const metadata = { title: "Demo task, applicant perspective" };
export const dynamic = "force-dynamic";

function safeReturn(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith(`${DEMO_HOME}`) || raw.includes("//") || raw.includes("\\")) return DEMO_HOME;
  return raw;
}

export default async function DemoTaskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const returnHref = safeReturn((await searchParams).return);
  const user = await requireDemoUser(`${DEMO_TASK_PATH}?return=${encodeURIComponent(returnHref)}`);
  return <DemoTaskPerspective storageScope={user.id} returnHref={returnHref} />;
}
