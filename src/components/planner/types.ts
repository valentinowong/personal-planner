export type PlannerDay = {
  key: string;
  weekday: string;
  monthText: string;
  dayNumber: string;
  dateObj: Date;
};

export type PlannerViewMode = "calendar" | "tasks";

export type DeleteAction = "delete" | "move_inbox" | "move_other";
