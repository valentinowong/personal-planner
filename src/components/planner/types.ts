import type { LocalTask } from "../../lib/db";

export type PlannerDay = {
  key: string;
  weekday: string;
  monthText: string;
  dayNumber: string;
  dateObj: Date;
};

export type PlannerViewMode = "calendar" | "tasks";

export type DeleteAction = "delete" | "move_inbox" | "move_other";

export type PlannerDragPreview = {
  task: LocalTask;
  x: number;
  y: number;
  variant?: "backlog" | "calendar" | "taskBoard";
};
