import type { LocalTask } from "../../data/local/db";

export type TaskScheduleState = "unscheduled" | "dateOnly" | "timed";

export function getTaskScheduleState(task: Pick<LocalTask, "due_date" | "planned_start" | "planned_end">): TaskScheduleState {
  if (task.planned_start || task.planned_end) {
    return "timed";
  }
  if (task.due_date) {
    return "dateOnly";
  }
  return "unscheduled";
}
