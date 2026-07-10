/**
 * Part C — Chat state machine for FP&A Forecast Review.
 * Stakeholders: Casey (Finance Analyst), Alex Kim (CFO), Jordan Lee (VP Sales).
 *
 * Alex at 8 min = D1 analog (asks about biggest concern — requires substantive reply).
 * Jordan at 12 min = M1 analog (delivers manager update: sales cycle +30 days, 2 at-risk customers).
 */

export type ChatMessage = {
  id: string;
  triggerId: string;
  sender: 'casey' | 'alex' | 'jordan' | 'candidate' | 'system';
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
  if (!session.d1_fired) return true; // A1 not yet fired — don't block early
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
  const modelSec = session.tabSeconds?.financials || session.tabSeconds?.Financials || 0;
  const opened = session.openedDocs || [];
  const assumptions = (session.assumptionTexts || []).join(' ').toLowerCase();

  // ── C1 — 90s: Casey tips on churn math ──────────────────────────────────
  if (!already(session, 'C1') && elapsed >= 90) {
    mark(session, 'C1');
    out.push(
      pushMsg(session, {
        triggerId: 'C1',
        sender: 'casey',
        name: 'Casey Park',
        role: 'Finance Analyst',
        body: "Quick heads-up — the Churn Update doc has some interesting math on growth vs. attrition that might affect how you read the revenue forecast. Worth a look before you stress-test the model.",
        elapsedSec: elapsed,
      })
    );
  }

  // ── C2 — 4+ min on Forecast Model without opening Churn Update ──────────
  if (
    !already(session, 'C2') &&
    modelSec >= 240 &&
    !opened.includes('churn_update')
  ) {
    mark(session, 'C2');
    out.push(
      pushMsg(session, {
        triggerId: 'C2',
        sender: 'casey',
        name: 'Casey Park',
        role: 'Finance Analyst',
        body: "Are you cross-checking against the Churn Update? The growth target makes a lot of assumptions about how much attrition the new logo pipeline has to overcome. It's in the data room if you haven't pulled it.",
        elapsedSec: elapsed,
      })
    );
  }

  // ── C3 — assumption with growth or margin ───────────────────────────────
  if (
    !already(session, 'C3') &&
    (/growth|margin|opex|churn/.test(assumptions))
  ) {
    mark(session, 'C3');
    out.push(
      pushMsg(session, {
        triggerId: 'C3',
        sender: 'casey',
        name: 'Casey Park',
        role: 'Finance Analyst',
        body: "Saw you're logging assumptions on growth or margins — want me to pull the Q2 actuals breakdown? Happy to sanity-check the numbers before you finalize.",
        elapsedSec: elapsed,
      })
    );
  }

  // ── C4 — 15 min, risks tab not opened ───────────────────────────────────
  const risksOpened = !!(session.tabSeconds?.risks || session.tabSeconds?.Risks);
  if (!already(session, 'C4') && elapsed >= 15 * 60 && !risksOpened) {
    mark(session, 'C4');
    out.push(
      pushMsg(session, {
        triggerId: 'C4',
        sender: 'casey',
        name: 'Casey Park',
        role: 'Finance Analyst',
        body: "Just flagging — have you looked at the Customer Concentration note? The enterprise renewal situation seems relevant before you sign off on the hiring budget.",
        elapsedSec: elapsed,
      })
    );
  }

  // ── C5 — after submit ────────────────────────────────────────────────────
  if (!already(session, 'C5') && session.submitted) {
    mark(session, 'C5');
    const cat = session.recommendation_category || 'your call';
    out.push(
      pushMsg(session, {
        triggerId: 'C5',
        sender: 'casey',
        name: 'Casey Park',
        role: 'Finance Analyst',
        body: `Nice work — I thought ${cat} made sense given what the data was showing. The churn math alone would have given me pause on the original plan.`,
        elapsedSec: elapsed,
      })
    );
  }

  // ── A1 — 8 min: Alex Kim (CFO) asks about biggest concern ───────────────
  // This is the D1 analog — substantive reply required to unlock submit.
  if (!already(session, 'A1') && elapsed >= 8 * 60) {
    mark(session, 'A1');
    session.d1_fired = true;
    out.push(
      pushMsg(session, {
        triggerId: 'A1',
        sender: 'alex',
        name: 'Alex Kim',
        role: 'CFO',
        body: "Before you finalize: what's your single biggest concern about the Q3 plan? I want your honest read — reply here when you have a view.",
        elapsedSec: elapsed,
        needsReply: true,
      })
    );
  }

  // ── J1 — 12 min: Jordan Lee (VP Sales) delivers the manager update ───────
  // This is the M1 analog — sales cycle +30 days, 2 customers at risk.
  if (!already(session, 'J1') && elapsed >= 12 * 60) {
    mark(session, 'J1');
    out.push(
      pushMsg(session, {
        triggerId: 'J1',
        sender: 'jordan',
        name: 'Jordan Lee',
        role: 'VP Sales',
        body: "Heads-up from my end before you wrap the forecast review: just came off a call with two of our largest enterprise accounts. Both have flagged extended procurement timelines — I'd add 30 days to your sales cycle assumption. Also treating both renewals as at-risk until their procurement teams confirm. Worth factoring into whatever you're recommending on the hiring side.",
        elapsedSec: elapsed,
      })
    );
  }

  // ── J2 — AI used 2+ times in 90s window ─────────────────────────────────
  const win = session.aiAskCountWindow || { t: 0, count: 0 };
  if (!already(session, 'J2') && win.count >= 2 && elapsed - win.t <= 90) {
    mark(session, 'J2');
    out.push(
      pushMsg(session, {
        triggerId: 'J2',
        sender: 'jordan',
        name: 'Jordan Lee',
        role: 'VP Sales',
        body: "No issue with using the AI tools — just make sure you're checking what it outputs against the actual data room figures before it goes in the recommendation. I've seen it miss context.",
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
 * Candidate reply to Alex A1 (or general chat). Enforces substantive check for A1 (D1 analog).
 */
export function handleCandidateChatReply(
  session: ChatSessionSlice,
  text: string
): D1BranchResult {
  const body = String(text || '').trim();
  const elapsed = session._elapsedSec || 0;

  // If A1 needs reply and this is the reply attempt
  if (session.d1_fired && !isSubstantiveReply(session.d1_reply_text || '')) {
    if (!isSubstantiveReply(body)) {
      return {
        accepted: false,
        rejectReason:
          "Give me a bit more than that — what specifically worries you about the plan?",
      };
    }
    session.d1_reply_text = body;
    pushMsg(session, {
      triggerId: 'A1_reply',
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
    if (/churn|retention|attrition|growth.*gap/.test(lower)) {
      branch = 'churn';
      follow =
        "That's the one I keep coming back to too. Make sure the memo is explicit about what the pipeline math requires — not just that churn is a risk, but what it means for the growth target.";
    } else if (/opex|margin|compress|expense/.test(lower)) {
      branch = 'margin';
      follow =
        'Fair call. If you\'re flagging margin compression, show me the numbers — how many pp of margin are we talking? That changes the hiring conversation.';
    } else if (/cash|runway|burn/.test(lower)) {
      branch = 'cash';
      follow =
        "Good instinct. 9 months is tight if Q3 revenue misses. Make sure your recommendation reflects what happens to runway in the downside case.";
    } else if (/renewal|customer|concentration|enterprise/.test(lower)) {
      branch = 'customer';
      follow =
        "Agreed. The enterprise concentration is real. Make sure you're specific in the memo about what you'd verify before approving the hiring.";
    } else {
      branch = 'generic';
      follow =
        "Okay — make sure that concern shows up clearly in your VP Memo. I'll be reading for it.";
    }
    session.d1_branch = branch;
    if (!already(session, 'A1_follow')) {
      mark(session, 'A1_follow');
      const followUp = pushMsg(session, {
        triggerId: 'A1_follow',
        sender: 'alex',
        name: 'Alex Kim',
        role: 'CFO',
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

/** Record AI ask for J2 window */
export function recordAiAsk(session: ChatSessionSlice): void {
  const t = session._elapsedSec || 0;
  if (!session.aiAskCountWindow || t - session.aiAskCountWindow.t > 90) {
    session.aiAskCountWindow = { t, count: 1 };
  } else {
    session.aiAskCountWindow.count += 1;
  }
}
