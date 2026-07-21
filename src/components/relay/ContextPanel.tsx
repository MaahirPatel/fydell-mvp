"use client";

import BriefPanel, { type MissionInfo } from "@/components/relay/BriefPanel";
import ClientInbox, { type ChatMessage } from "@/components/relay/ClientInbox";
import type { InboxParticipant } from "@/lib/relay/inbox-seed";
import { cn } from "@/lib/cn";

export type ContextTab = "brief" | "chat";

export default function ContextPanel({
  tab,
  onTabChange,
  unreadChat,
  mission,
  canonicalFacts,
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  channelName,
  participants,
  onOpenFile,
}: {
  tab: ContextTab;
  onTabChange: (tab: ContextTab) => void;
  unreadChat?: number;
  mission: MissionInfo;
  canonicalFacts: string[];
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  channelName?: string;
  participants?: InboxParticipant[];
  onOpenFile?: (path: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#10141D]">
      <div className="flex gap-1 border-b border-white/[0.08] px-2 py-2">
        {(
          [
            { id: "brief" as const, label: "Brief" },
            { id: "chat" as const, label: "Client chat" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              tab === t.id ? "bg-white/[0.08] text-[#F4F5F7]" : "text-[#687182] hover:text-[#9AA3B2]"
            )}
          >
            {t.label}
            {t.id === "chat" && unreadChat && unreadChat > 0 ? (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6470FF] px-1 text-[10px] text-white">
                {unreadChat}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "brief" ? (
          <div className="h-full overflow-y-auto">
            <BriefPanel mission={mission} canonicalFacts={canonicalFacts} variant="brief" compact />
          </div>
        ) : (
          <ClientInbox
            canonicalFacts={canonicalFacts}
            messages={messages}
            draft={draft}
            onDraftChange={onDraftChange}
            onSend={onSend}
            sending={sending}
            channelName={channelName}
            participants={participants}
            onOpenFile={onOpenFile}
          />
        )}
      </div>
    </div>
  );
}
