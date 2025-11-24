import { HOUR_BLOCK_HEIGHT } from "../time";

export const BACKLOG_LIST_HEADER_ID_PREFIX = "backlog-list-header-";
export const BACKLOG_LIST_ZONE_ID_PREFIX = "backlog-list-zone-";

export type PlannerDropTarget =
  | { type: "task"; listId: string; taskId: string; position: "before" | "after" }
  | { type: "list"; listId: string }
  | { type: "day"; dayKey: string; origin?: "daily" | "taskBoard" }
  | { type: "calendarSlot"; dayKey: string; hour: number };

export type PlannerListHoverTarget = Extract<PlannerDropTarget, { type: "list" | "task" }>;

export function resolvePlannerDropTarget(x: number, y: number, draggingTaskId?: string): PlannerDropTarget | null {
  if (typeof document === "undefined") return null;
  const candidates =
    typeof document.elementsFromPoint === "function"
      ? (document.elementsFromPoint(x, y) as (HTMLElement | null)[])
      : [document.elementFromPoint(x, y) as HTMLElement | null];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const target = resolveDropTargetFromNode(candidate, draggingTaskId ?? null, y);
    if (target) {
      return target;
    }
  }
  return null;
}

function resolveDropTargetFromNode(node: HTMLElement, draggingTaskId: string | null, pointerY: number): PlannerDropTarget | null {
  let current: HTMLElement | null = node;
  while (current) {
    const target = current.dataset?.dragTarget ?? current.getAttribute?.("data-drag-target");
    if (target === "backlogTask") {
      const listId = current.dataset?.listId ?? current.getAttribute("data-list-id");
      const taskId = current.dataset?.taskId ?? current.getAttribute("data-task-id");
      if (listId && taskId && taskId !== draggingTaskId) {
        const rect = current.getBoundingClientRect();
        const position: "before" | "after" = pointerY >= rect.top + rect.height / 2 ? "after" : "before";
        return { type: "task", listId, taskId, position };
      }
    } else if (target === "listEntry" || target === "listZone") {
      const listId = current.dataset?.listId ?? current.getAttribute("data-list-id");
      if (listId) {
        return { type: "list", listId };
      }
    } else if (target === "dailyTaskList" || target === "taskColumn") {
      const dayKey = current.dataset?.dayKey ?? current.getAttribute("data-day-key");
      if (dayKey) {
        return { type: "day", dayKey, origin: target === "taskColumn" ? "taskBoard" : "daily" };
      }
    } else if (target === "calendarSlot") {
      const dayKey = current.dataset?.dayKey ?? current.getAttribute("data-day-key");
      const hourString = current.dataset?.hour ?? current.getAttribute("data-hour");
      if (dayKey && hourString) {
        const hour = Number(hourString);
        if (!Number.isNaN(hour)) {
          return { type: "calendarSlot", dayKey, hour };
        }
      }
    } else if (target === "calendarDay") {
      const dayKey = current.dataset?.dayKey ?? current.getAttribute("data-day-key");
      if (dayKey) {
        const rect = current.getBoundingClientRect();
        const relativeY = pointerY - rect.top;
        const slotHeight = HOUR_BLOCK_HEIGHT || 60;
        const hour = Math.max(0, Math.min(23, Math.floor(relativeY / slotHeight)));
        return { type: "calendarSlot", dayKey, hour };
      }
    }
    const domId = current.id ?? current.getAttribute?.("id");
    const listIdFromDomId = resolveListIdFromDomId(domId);
    if (listIdFromDomId) {
      return { type: "list", listId: listIdFromDomId };
    }
    current = current.parentElement;
  }
  return null;
}

function resolveListIdFromDomId(domId?: string | null): string | null {
  if (!domId) return null;
  if (domId.startsWith(BACKLOG_LIST_HEADER_ID_PREFIX)) {
    return domId.slice(BACKLOG_LIST_HEADER_ID_PREFIX.length);
  }
  if (domId.startsWith(BACKLOG_LIST_ZONE_ID_PREFIX)) {
    return domId.slice(BACKLOG_LIST_ZONE_ID_PREFIX.length);
  }
  return null;
}
