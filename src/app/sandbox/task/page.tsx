import { redirect } from "next/navigation";

/** The demo task moved under its scenario key. */
export default function SandboxTaskPage() {
  redirect("/sandbox/event-inbox/workspace");
}
