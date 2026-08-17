import type {
  EventAction,
  EventTrigger,
  JsonValue,
  SimulationAttempt,
  SimulationScenarioDefinition,
  TelemetryEvent,
} from "../types";
import { flagEquals, pushNotification, pushScenarioEvent, setWorldFlag, unlockTool } from "./worldState";
import { revealResource } from "./resourceLibrary";
import { addTaskDefinition, setTaskPriority } from "./taskManager";
import { injectInboundMessage } from "./communicationRuntime";

function triggerMatches(
  trigger: EventTrigger,
  attempt: SimulationAttempt,
  elapsedMs: number,
  firedRules: Set<string>
): boolean {
  switch (trigger.kind) {
    case "TIME":
      return elapsedMs >= trigger.afterMs;
    case "TELEMETRY": {
      const count = attempt.telemetry.filter((e) => e.type === trigger.eventType).length;
      return count >= (trigger.minCount ?? 1);
    }
    case "TASK":
      return attempt.tasks[trigger.taskId]?.status === trigger.status;
    case "ARTIFACT":
      return Object.values(attempt.artifacts).some(
        (a) => a.kind === trigger.artifactKind && a.content.trim().length > 0
      );
    case "WORLD_STATE":
      return flagEquals(attempt.world, trigger.flag, trigger.equals);
    case "RULE":
      return firedRules.has(trigger.ruleId);
    case "ALL":
      return trigger.triggers.every((t) => triggerMatches(t, attempt, elapsedMs, firedRules));
    case "ANY":
      return trigger.triggers.some((t) => triggerMatches(t, attempt, elapsedMs, firedRules));
    default:
      return false;
  }
}

export function evaluateEvents(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  elapsedMs: number,
  firedEventIds: Set<string>,
  causedBy?: TelemetryEvent
): {
  attempt: SimulationAttempt;
  fired: string[];
} {
  let next = attempt;
  const fired: string[] = [];
  const firedRules = new Set<string>();

  for (const def of scenario.events) {
    const once = def.once !== false;
    if (once && firedEventIds.has(def.id)) continue;
    if (!triggerMatches(def.trigger, next, elapsedMs, firedRules)) continue;

    fired.push(def.id);
    firedEventIds.add(def.id);
    for (const action of def.actions) {
      next = applyAction(scenario, next, action, elapsedMs, causedBy);
    }
  }

  return { attempt: next, fired };
}

function applyAction(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  action: EventAction,
  elapsedMs: number,
  causedBy?: TelemetryEvent
): SimulationAttempt {
  switch (action.kind) {
    case "UPDATE_WORLD_STATE": {
      return {
        ...attempt,
        world: setWorldFlag(attempt.world, action.flag, action.value, elapsedMs),
      };
    }
    case "REVEAL_RESOURCE": {
      const resources = revealResource(attempt.resources, action.resourceId);
      const world = pushScenarioEvent(
        attempt.world,
        "RESOURCE_REVEALED",
        `Resource revealed: ${action.resourceId}`,
        elapsedMs,
        { resourceId: action.resourceId },
        causedBy ? [causedBy.id] : undefined
      );
      return { ...attempt, resources, world };
    }
    case "SHOW_NOTIFICATION": {
      return {
        ...attempt,
        world: pushNotification(attempt.world, action.message, action.tone ?? "neutral", elapsedMs),
      };
    }
    case "UNLOCK_TOOL": {
      return { ...attempt, world: unlockTool(attempt.world, action.toolId) };
    }
    case "CHANGE_TASK_PRIORITY": {
      const tasks = setTaskPriority(attempt.tasks, action.taskId, action.priority);
      const world = pushScenarioEvent(
        attempt.world,
        "TASK_REPRIORITIZED",
        `Task ${action.taskId} → ${action.priority}`,
        elapsedMs,
        { taskId: action.taskId, priority: action.priority }
      );
      return { ...attempt, tasks, world };
    }
    case "CREATE_TASK": {
      return { ...attempt, tasks: addTaskDefinition(attempt.tasks, action.task) };
    }
    case "SEND_MESSAGE":
    case "ADD_INBOX_ITEM": {
      const person = scenario.people.find((p) => p.id === action.personId);
      if (!person) return attempt;
      const injected = injectInboundMessage({
        person,
        conversations: attempt.conversations,
        messages: attempt.messages,
        body: action.body,
        subject: "subject" in action ? action.subject : undefined,
        elapsedMs,
      });
      const world = pushScenarioEvent(
        attempt.world,
        action.kind === "SEND_MESSAGE" ? "PERSON_REPLIED" : "CUSTOMER_ESCALATION",
        action.kind === "ADD_INBOX_ITEM" ? `Inbox: ${person.name}` : `Message from ${person.name}`,
        elapsedMs,
        { personId: action.personId },
        causedBy ? [causedBy.id] : undefined
      );
      return {
        ...attempt,
        conversations: injected.conversations,
        messages: injected.messages,
        world,
      };
    }
    case "EMIT_SCENARIO_EVENT": {
      return {
        ...attempt,
        world: pushScenarioEvent(
          attempt.world,
          action.scenarioKind,
          action.label,
          elapsedMs,
          action.payload,
          causedBy ? [causedBy.id] : undefined
        ),
      };
    }
    default:
      return attempt;
  }
}

export function setFlags(
  attempt: SimulationAttempt,
  flags: Record<string, JsonValue>,
  elapsedMs: number
): SimulationAttempt {
  let world = attempt.world;
  for (const [flag, value] of Object.entries(flags)) {
    world = setWorldFlag(world, flag, value, elapsedMs);
  }
  return { ...attempt, world };
}
