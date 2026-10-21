import type { EventType } from "@/lib/impact/types";

export type IdempotencyInput = {
  type: EventType;
  residentId: string;
  occurredAt: string;
  resourceId?: string | null;
  needId?: string | null;
  actionId?: string | null;
  applicationId?: string | null;
  goalId?: string | null;
  outcomeId?: string | null;
  sessionId?: string | null;
};

/**
 * One key per real-world occurrence.
 * A repeated save, a second view on the same day, or a second draft save collapses.
 * A resource view never shares a key with an application event.
 * A self-reported outcome never shares a key with a verified outcome.
 */
export function idempotencyKey(event: IdempotencyInput): string {
  switch (event.type) {
    case "assessment_started":
    case "assessment_completed":
      return `${event.type}:${event.residentId}`;
    case "resource_viewed":
      return `resource_viewed:${event.residentId}:${event.resourceId ?? ""}:${event.needId ?? ""}:${event.occurredAt.slice(0, 10)}`;
    case "resource_saved":
      return `resource_saved:${event.residentId}:${event.resourceId ?? ""}:${event.needId ?? ""}`;
    case "need_selected":
      return `need_selected:${event.residentId}:${event.needId ?? ""}:${event.occurredAt.slice(0, 10)}`;
    case "chat_session_started":
      return `chat_session_started:${event.residentId}:${event.sessionId ?? ""}`;
    case "action_started":
    case "action_completed":
      return `${event.type}:${event.actionId ?? ""}`;
    case "application_started":
    case "application_draft_saved":
    case "application_submitted_confirmed":
      return `${event.type}:${event.applicationId ?? ""}`;
    case "goal_completed":
      return `goal_completed:${event.goalId ?? ""}`;
    case "outcome_reported":
    case "outcome_verified":
      return `${event.type}:${event.outcomeId ?? ""}`;
    default: {
      const unreachable: never = event.type;
      return unreachable;
    }
  }
}
