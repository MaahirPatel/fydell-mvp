import { extendInvitation } from "@/lib/invitations/operations";
type R = ReturnType<typeof extendInvitation>;
const x: R = null as any;
if (!x.ok) {
  const c = x.code;
}
