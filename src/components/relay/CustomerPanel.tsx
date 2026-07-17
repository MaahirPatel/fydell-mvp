"use client";

export type ChatMessage = { id: string; actor: string; text: string; at: string };

export default function CustomerPanel({
  customerContext,
  canonicalFacts,
  chat,
  chatDraft,
  onChatDraftChange,
  onSend,
}: {
  customerContext: string;
  canonicalFacts: string[];
  chat: ChatMessage[];
  chatDraft: string;
  onChatDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/[0.06] p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Customer context</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
          {customerContext || "No additional context provided."}
        </p>
      </div>

      {canonicalFacts.length > 0 && (
        <div className="border-b border-white/[0.06] p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Known constraints</p>
          <ul className="mt-1.5 space-y-1">
            {canonicalFacts.map((f) => (
              <li key={f} className="text-[11.5px] leading-relaxed text-white/50">
                · {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Customer chat</p>
        {chat.length === 0 && <p className="text-[12.5px] text-white/35">No messages yet.</p>}
        {chat.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[12.5px] leading-relaxed ${
              m.actor === "candidate" ? "ml-auto bg-[#3B5BFF]/20 text-white/90" : "bg-white/[0.06] text-white/75"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex gap-2 border-t border-white/[0.06] p-3"
      >
        <input
          value={chatDraft}
          onChange={(e) => onChatDraftChange(e.target.value)}
          placeholder="Message the customer…"
          className="flex-1 rounded-[7px] border border-white/10 bg-black/30 px-3 py-2 text-[12.5px] text-white/85"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-[7px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C]"
        >
          Send
        </button>
      </form>
    </div>
  );
}
