import { redirect } from "next/navigation";

/** Orphaned route: nothing linked here and it duplicated the product story. */
export default function CandidatesPage() {
  redirect("/product");
}
