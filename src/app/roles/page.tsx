import { redirect } from "next/navigation";

/**
 * Roles marketed six role families as if each were a product. Only one
 * evaluation is published, so this route points at it. The underlying
 * `roles.ts` data is untouched and still drives the engine.
 */
export default function RolesPage() {
  redirect("/simulations");
}
