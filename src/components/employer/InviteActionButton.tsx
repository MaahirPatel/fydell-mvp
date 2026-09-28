"use client";

import { Button } from "@/components/ui/Button";
import { useInviteModal } from "./InviteCandidateModal";

/**
 * Primary "Invite a candidate" action for empty states that live outside the
 * sidebar. Opens the same workspace invite dialog the rail button opens, so
 * there is exactly one invite flow and every entry point reaches it in one
 * step instead of landing on another page that holds the real button.
 */
export default function InviteActionButton({
  label = "Invite a candidate",
  variant = "primary",
  size = "md",
}: {
  label?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}) {
  const { open } = useInviteModal();
  return (
    <Button variant={variant} size={size} onClick={() => open()}>
      {label}
    </Button>
  );
}
