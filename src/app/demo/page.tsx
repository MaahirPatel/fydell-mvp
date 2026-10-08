import { redirect } from "next/navigation";

export const metadata = {
  title: "Demo",
  robots: { index: false, follow: false },
};

/** The demo workspace is offered during sign-up; old links land on that choice. */
export default function DemoPage() {
  redirect("/signup?intent=demo");
}
