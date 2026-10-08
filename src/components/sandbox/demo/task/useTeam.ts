"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import type { ScenarioProgress, TeamMessage } from "@/lib/sandbox-demo/state";
import { TEAM_LIMIT } from "@/lib/sandbox-demo/state";
import { dueCheckin, type CheckinTrigger } from "@/lib/sandbox-demo/team";
import {
  CHECKIN_MAX_TRIES,
  TEAM_ENDPOINT,
  appendReply,
  buildWorkspace,
  checkinBackoffMs,
  checkinClientId,
  checkinFailureText,
  checkinInput,
  checkinSenderId,
  interpretTeamCall,
  newMessageId,
  setMessageStatus,
  toHistory,
  type TeamCallResult,
  type TeamRequest,
} from "@/lib/sandbox-demo/team-client";
import type { UpdateProgress } from "../useDemoState";

const CHECKIN_INTERVAL_MS = 15_000;

async function post(body: TeamRequest, teammateIds: readonly string[]): Promise<TeamCallResult> {
  try {
    const res = await fetch(TEAM_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return interpretTeamCall(res.status, json, teammateIds);
  } catch {
    return interpretTeamCall(0, null, teammateIds);
  }
}

function withTeam(p: ScenarioProgress, recipe: (team: TeamMessage[]) => TeamMessage[]): ScenarioProgress {
  return { ...p, team: recipe(p.team).slice(-TEAM_LIMIT) };
}

function markDelivered(p: ScenarioProgress, trigger: CheckinTrigger): ScenarioProgress {
  return p.delivered.includes(trigger) ? p : { ...p, delivered: [...p.delivered, trigger] };
}

/**
 * Live simulated teammates for one scenario. Messages go to the server as soon
 * as they are sent; check-ins follow the published rules in `dueCheckin`. A
 * reply is only ever what the server answered: when it is unavailable the
 * candidate's message stays, with the server's reason and a retry.
 */
export function useTeam(scenario: DemoScenario, progress: ScenarioProgress, updateProgress: UpdateProgress) {
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  });
  const teammateIds = useMemo(() => scenario.teammates.map((m) => m.id), [scenario]);

  const inFlight = useRef(0);
  const [typing, setTyping] = useState<string[]>([]);
  const failures = useRef(new Map<CheckinTrigger, { count: number; nextAt: number }>());

  const begin = useCallback((who: string) => {
    inFlight.current += 1;
    setTyping((list) => [...list, who]);
  }, []);
  const end = useCallback((who: string) => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    setTyping((list) => {
      const i = list.indexOf(who);
      return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
    });
  }, []);

  const deliver = useCallback(
    async (message: TeamMessage, before: TeamMessage[]) => {
      if (message.from !== "you" || !message.to) return;
      const to = message.to;
      begin(to);
      const result = await post(
        {
          kind: "message",
          scenarioKey: scenario.key,
          clientMsgId: message.id,
          teammateId: to,
          text: message.text,
          history: toHistory(before, message.id),
          workspace: buildWorkspace(scenario, progressRef.current, Date.now()),
        },
        teammateIds,
      );
      end(to);
      const at = new Date().toISOString();
      if (result.kind === "answered") {
        updateProgress((p) => withTeam(p, (team) => appendReply(setMessageStatus(team, message.id, "sent", null), result.reply, at)));
      } else {
        updateProgress((p) => withTeam(p, (team) => setMessageStatus(team, message.id, "unavailable", result.message)));
      }
    },
    [begin, end, scenario, teammateIds, updateProgress],
  );

  const send = useCallback(
    (to: string, text: string) => {
      const body = text.trim();
      if (!body || !teammateIds.includes(to)) return;
      const at = new Date().toISOString();
      const message: TeamMessage = { id: newMessageId(), from: "you", to, text: body, kind: "message", trigger: null, factIds: [], at, status: "sending", notice: null };
      const before = progressRef.current.team;
      updateProgress((p) => ({ ...withTeam(p, (team) => [...team, message]), lastActivityAt: at }));
      void deliver(message, before);
    },
    [deliver, teammateIds, updateProgress],
  );

  const retry = useCallback(
    (id: string) => {
      const team = progressRef.current.team;
      const message = team.find((m) => m.id === id);
      if (!message || message.status !== "unavailable") return;
      updateProgress((p) => withTeam(p, (list) => setMessageStatus(list, id, "sending", null)));
      void deliver({ ...message, status: "sending", notice: null }, team);
    },
    [deliver, updateProgress],
  );

  const tick = useCallback(async () => {
    if (inFlight.current > 0) return;
    const current = progressRef.current;
    if (!current.startedAt) return;
    const now = Date.now();
    const trigger = dueCheckin(checkinInput(scenario, current, now));
    if (!trigger) return;
    const failed = failures.current.get(trigger);
    if (failed && failed.nextAt > now) return;
    const sender = checkinSenderId(scenario, trigger);
    begin(sender);
    const result = await post(
      {
        kind: "checkin",
        scenarioKey: scenario.key,
        clientMsgId: checkinClientId(trigger),
        trigger,
        history: toHistory(current.team),
        workspace: buildWorkspace(scenario, current, now),
      },
      teammateIds,
    );
    end(sender);
    const at = new Date().toISOString();
    if (result.kind === "answered") {
      failures.current.delete(trigger);
      updateProgress((p) => markDelivered(withTeam(p, (team) => appendReply(team, result.reply, at)), trigger));
      return;
    }
    const count = (failed?.count ?? 0) + 1;
    if (count < CHECKIN_MAX_TRIES) {
      failures.current.set(trigger, { count, nextAt: Date.now() + Math.max(checkinBackoffMs(count), (result.retryAfterSeconds ?? 0) * 1000) });
      return;
    }
    failures.current.delete(trigger);
    const notice: TeamMessage = {
      id: `notice_${checkinClientId(trigger)}`,
      from: "system",
      to: null,
      text: checkinFailureText(scenario, trigger),
      kind: "notice",
      trigger,
      factIds: [],
      at,
      status: "sent",
      notice: null,
    };
    updateProgress((p) => markDelivered(withTeam(p, (team) => (team.some((m) => m.id === notice.id) ? team : [...team, notice])), trigger));
  }, [begin, end, scenario, teammateIds, updateProgress]);

  useEffect(() => {
    const first = window.setTimeout(() => void tick(), 1500);
    const id = window.setInterval(() => void tick(), CHECKIN_INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [tick]);

  /* Right after a run or an edit, check again once things settle. */
  const { runCount, files } = progress;
  useEffect(() => {
    const id = window.setTimeout(() => void tick(), 2500);
    return () => window.clearTimeout(id);
  }, [runCount, files, tick]);

  const messageInFlight = progress.team.some((m) => m.from === "you" && m.status === "sending");
  return { send, retry, typing, messageInFlight };
}
