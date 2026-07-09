/**
 * Part C — Chat state machine (Priya, Daniel, Marcus).
 * Exact triggers, no repeats, D1 substantive reply gate.
 */

export type ChatMessage = {
  id: string;
  triggerId: string;
  sender: 'priya' | 'daniel' | 'marcus' | 'candidate' | 'system';
  name: string;
  role: string;
  body: string;
  timestamp: string;
  elapsedSec: number;
  needsReply?: boolean;
  isReply?: boolean;
};

export type ChatSessionSlice = {
  used_trigger_ids: string[];
  chatMessages: ChatMessage[];
  d1_fired: boolean;
  d1_reply_text: string | null;
  d1_branch: string | null;
  tabSeconds: Record<string, number>;
  openedDocs: string[];
  assumptionTexts: string[];
  aiAskCountWindow: { t: number; count: number };
  recommendation_category?: string | null;
  submitted?: boolean;
  _elapsedSec: number;
};

const GENERIC_REJECT = /^(ok|okay|sure|yes|no|n\/a|na|k|thanks|thank you|yep|yeah)\.?$/i;

export function isSubstantiveReply(text: string): boolean {
  const t = String(text || '').trim();
  if (t.length < 15) return false;
  if (GENERIC_REJECT.test(t)) return false;
  return true;
}

export function hasRepliedToD1AndSubstantive(session: ChatSessionSlice): boolean {
  if (!session.d1_fired) return true; // D1 not yet fired — don't block early
  return isSubstantiveReply(session.d1_reply_text || '');
}

function already(session: ChatSessionSlice, id: string): boolean {
  return (session.used_trigger_ids || []).includes(id);
}

function mark(session: ChatSessionSlice, id: string): void {
  if (!session.used_trigger_ids) session.used_trigger_ids = [];
  if (!session.used_trigger_ids.includes(id)) session.used_trigger_ids.push(id);
}

function pushMsg(
  session: ChatSessionSlice,
  msg: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string }
): ChatMessage {
  const full: ChatMessage = {
    id: msg.id || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...msg,
  };
  if (!session.chatMessages) session.chatMessages = [];
  // no verbatim body repeat
  if (session.chatMessages.some((m) => m.body === full.body)) return full;
  session.chatMessages.push(full);
  return full;
}

/**
 * Evaluate which triggers should fire given current session state.
 * Returns newly fired messages (may be empty).
 */
export function tickChatTriggers(session: ChatSessionSlice): ChatMessage[] {
  const out: ChatMessage[] = [];
  const elapsed = session._elapsedSec || 0;
  const finSec = session.tabSeconds?.financials || session.tabSeconds?.Financials || 0;
  const opened = session.openedDocs || [];
  const assumptions = (session.assumptionTexts || []).join(' ').toLowerCase();

  // P1 — 90s
  if (!already(session, 'P1') && elapsed >= 90) {
    mark(session, 'P1');
    out.push(
      pushMsg(session, {
        triggerId: 'P1',
        sender: 'priya',
        name: 'Priya Shah',
        role: 'Associate, deal team',
        body: "Hey — I pulled the comps and the entry multiple looks rich versus peers. Curious what you think once you've been through the model.",
        elapsedSec: elapsed,
      })
    );
  }

  // P2 — 4+ min on Financials without Comps
  if (
    !already(session, 'P2') &&
    finSec >= 240 &&
    !opened.includes('comps_precedents')
  ) {
    mark(session, 'P2');
    out.push(
      pushMsg(session, {
        triggerId: 'P2',
        sender: 'priya',
        name: 'Priya Shah',
        role: 'Associate, deal team',
        body: "Have you had a chance to look at the comp set yet? It's in the Data Room if not — might change your read on valuation.",
        elapsedSec: elapsed,
      })
    );
  }

  // P3 — assumption with growth/terminal
  if (
    !already(session, 'P3') &&
    (/growth|terminal/.test(assumptions))
  ) {
    mark(session, 'P3');
    out.push(
      pushMsg(session, {
        triggerId: 'P3',
        sender: 'priya',
        name: 'Priya Shah',
        role: 'Associate, deal team',
        body: 'Saw you flagged something on growth — want a second pair of eyes before you finalize? Happy to sanity check.',
        elapsedSec: elapsed,
      })
    );
  }

  // P4 — Risks not opened by minute 15
  const risksOpened = !!(session.tabSeconds?.risks || session.tabSeconds?.Risks);
  if (!already(session, 'P4') && elapsed >= 15 * 60 && !risksOpened) {
    mark(session, 'P4');
    out.push(
      pushMsg(session, {
        triggerId: 'P4',
        sender: 'priya',
        name: 'Priya Shah',
        role: 'Associate, deal team',
        body: "One thing I'd flag before you wrap up — have you looked at customer concentration? Worth at least a line in the memo.",
        elapsedSec: elapsed,
      })
    );
  }

  // P5 — after submit
  if (!already(session, 'P5') && session.submitted) {
    mark(session, 'P5');
    const cat = session.recommendation_category || 'your call';
    out.push(
      pushMsg(session, {
        triggerId: 'P5',
        sender: 'priya',
        name: 'Priya Shah',
        role: 'Associate, deal team',
        body: `Nice work getting through that under time pressure. For what it's worth, my read matched yours on ${cat}.`,
        elapsedSec: elapsed,
      })
    );
  }

  // D1 — 8 min
  if (!already(session, 'D1') && elapsed >= 8 * 60) {
    mark(session, 'D1');
    session.d1_fired = true;
    out.push(
      pushMsg(session, {
        triggerId: 'D1',
        sender: 'daniel',
        name: 'Daniel Chen',
        role: 'Managing Director',
        body: "Before you finalize: what's your read on the single biggest risk in this deal? Reply here when you have a view.",
        elapsedSec: elapsed,
        needsReply: true,
      })
    );
  }

  // M1 — 12 min, Retention CSV not opened
  if (
    !already(session, 'M1') &&
    elapsed >= 12 * 60 &&
    !opened.includes('retention_csv')
  ) {
    mark(session, 'M1');
    out.push(
      pushMsg(session, {
        triggerId: 'M1',
        sender: 'marcus',
        name: 'Marcus Patel',
        role: 'Finance Manager',
        body: 'Quick note — the management deck is pretty bullish on customer retention. Worth cross-checking against the underlying data before you lean on that in your recommendation.',
        elapsedSec: elapsed,
      })
    );
  }

  // M2 — AI 2+ times in 90s window
  const win = session.aiAskCountWindow || { t: 0, count: 0 };
  if (!already(session, 'M2') && win.count >= 2 && elapsed - win.t <= 90) {
    mark(session, 'M2');
    out.push(
      pushMsg(session, {
        triggerId: 'M2',
        sender: 'marcus',
        name: 'Marcus Patel',
        role: 'Finance Manager',
        body: "No judgment on using the tools — just make sure you're checking what it gives you before it goes in the model. I've seen it miss things.",
        elapsedSec: elapsed,
      })
    );
  }

  return out;
}

export type D1BranchResult = {
  accepted: boolean;
  rejectReason?: string;
  followUp?: ChatMessage;
  branch?: string;
};

/**
 * Candidate reply to Daniel D1 (or general chat). Enforces substantive check for D1.
 */
export function handleCandidateChatReply(
  session: ChatSessionSlice,
  text: string
): D1BranchResult {
  const body = String(text || '').trim();
  const elapsed = session._elapsedSec || 0;

  // If D1 needs reply and this is the reply attempt
  if (session.d1_fired && !isSubstantiveReply(session.d1_reply_text || '')) {
    if (!isSubstantiveReply(body)) {
      return {
        accepted: false,
        rejectReason:
          "Give me a bit more than that — what specifically worries you?",
      };
    }
    session.d1_reply_text = body;
    pushMsg(session, {
      triggerId: 'D1_reply',
      sender: 'candidate',
      name: 'You',
      role: 'Candidate',
      body,
      elapsedSec: elapsed,
      isReply: true,
    });

    const lower = body.toLowerCase();
    let follow: string;
    let branch: string;
    if (/customer|concentration|retention/.test(lower)) {
      branch = 'customer';
      follow =
        "Agreed, that's the one I'd underwrite hardest. Make sure the memo says what you'd do about it, not just that it exists.";
    } else if (/multiple|valuation|price|overpay/.test(lower)) {
      branch = 'valuation';
      follow =
        'Fair. Just make sure that view is reflected in your recommendation, not buried in a footnote.';
    } else if (/growth|terminal|forecast/.test(lower)) {
      branch = 'growth';
      follow =
        "That's a real one. Did you stress-test what happens if that assumption is wrong?";
    } else {
      branch = 'generic';
      follow =
        "Okay — make sure whatever you flagged shows up clearly in your final recommendation. I'll be reading for it.";
    }
    session.d1_branch = branch;
    if (!already(session, 'D1_follow')) {
      mark(session, 'D1_follow');
      const followUp = pushMsg(session, {
        triggerId: 'D1_follow',
        sender: 'daniel',
        name: 'Daniel Chen',
        role: 'Managing Director',
        body: follow,
        elapsedSec: elapsed,
      });
      return { accepted: true, followUp, branch };
    }
    return { accepted: true, branch };
  }

  // Ordinary candidate message
  pushMsg(session, {
    triggerId: 'candidate_msg',
    sender: 'candidate',
    name: 'You',
    role: 'Candidate',
    body,
    elapsedSec: elapsed,
    isReply: true,
  });
  return { accepted: true };
}

/** Record AI ask for M2 window */
export function recordAiAsk(session: ChatSessionSlice): void {
  const t = session._elapsedSec || 0;
  if (!session.aiAskCountWindow || t - session.aiAskCountWindow.t > 90) {
    session.aiAskCountWindow = { t, count: 1 };
  } else {
    session.aiAskCountWindow.count += 1;
  }
}
