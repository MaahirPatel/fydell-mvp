"use client";

import { useInviteModal } from "./InviteCandidateModal";

export default function InviteHomeButton({ label = "Invite a candidate" }: { label?: string }) {
  const { open } = useInviteModal();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex h-9 items-center rounded-[8px] bg-[#eceef1] px-3.5 text-[13.5px] font-medium text-[#0a0b0d] transition-colors hover:bg-white"
    >
      {label}
    </button>
  );
}
