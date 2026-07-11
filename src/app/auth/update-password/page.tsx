import { redirect } from "next/navigation";

/** Canonical recovery landing path preferred by production docs. */
export default function AuthUpdatePasswordPage() {
  redirect("/reset-password");
}
