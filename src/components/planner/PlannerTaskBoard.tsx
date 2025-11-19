import { useCallback, useMemo, type MutableRefObject } from "react";
import { Pressable, Text, View } from "react-native";
import type { ViewToken } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashList as FlashListType } from "@shopify/flash-list";
import { AddTaskInput } from "../AddTaskInput";
import { TaskCard } from "../TaskCard";
import type { LocalTask } from "../../lib/db";
import { usePlannerStyles } from "./PlannerStylesContext";
import type { PlannerDay } from "./types";
import { DAY_COLUMN_WIDTH } from "./time";
import { getTaskTimeMetrics } from "./taskTime";

export type PlannerTaskBoardProps = {
  days: PlannerDay[];
  tasksByDay: Record<string, LocalTask[]>;
  pendingTask: LocalTask | null;
  onDropPending: (dayKey: string) => Promise<void>;
  onAddTask: (dayKey: string, title: string) => Promise<void>;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onOpenTask: (task: LocalTask) => void;
  onSelectDay: (dayKey: string) => void;
  selectedDayKey: string;
  onReachPast?: () => void;
  onReachFuture?: () => void;
  listRef?: MutableRefObject<FlashListType<PlannerDay> | null>;
  onVisibleRangeChange?: (start: PlannerDay | null, end: PlannerDay | null) => void;
};

export function PlannerTaskBoard({
  days,
  tasksByDay,
  pendingTask,
  onDropPending,
  onAddTask,
  onToggleTask,
  onOpenTask,
  onSelectDay,
  selectedDayKey,
  onReachPast,
  onReachFuture,
  listRef,
  onVisibleRangeChange,
}: PlannerTaskBoardProps) {
  const styles = usePlannerStyles();
  const dayIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    days.forEach((day, index) => {
      map[day.key] = index;
    });
    return map;
  }, [days]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!onVisibleRangeChange) return;
      let minIndex = Number.POSITIVE_INFINITY;
      let maxIndex = -1;
      viewableItems.forEach((token) => {
        const key = typeof token.key === "string" || typeof token.key === "number" ? String(token.key) : null;
        if (!key) return;
        const index = dayIndexMap[key];
        if (index === undefined) return;
        if (index < minIndex) minIndex = index;
        if (index > maxIndex) maxIndex = index;
      });
      if (minIndex === Number.POSITIVE_INFINITY || maxIndex === -1) return;
      const startDay = days[minIndex];
      const endDay = days[maxIndex];
      if (startDay && endDay) {
        onVisibleRangeChange(startDay, endDay);
      }
    },
    [dayIndexMap, days, onVisibleRangeChange],
  );

  return (
    <FlashList
      ref={listRef ?? null}
      horizontal
      data={days}
      estimatedItemSize={DAY_COLUMN_WIDTH + 16}
      keyExtractor={(day) => day.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.taskBoardRow}
      onEndReached={onReachFuture}
      onEndReachedThreshold={0.4}
      onStartReached={onReachPast}
      onStartReachedThreshold={0.4}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item: day }) => {
        const dayTasks = tasksByDay[day.key] ?? [];
        const isSelected = day.key === selectedDayKey;
        return (
          <View style={[styles.taskColumn, isSelected && styles.taskColumnSelected]}>
            <Pressable style={styles.taskColumnHeader} onPress={() => onSelectDay(day.key)}>
              <Text style={styles.taskColumnDay}>{day.weekday}</Text>
              <Text style={styles.taskColumnDate}>{`${day.monthText} ${day.dayNumber}`}</Text>
            </Pressable>
            {pendingTask ? (
              <Pressable style={styles.dropZone} onPress={() => onDropPending(day.key)}>
                <Text style={styles.dropZoneLabel}>Drop “{pendingTask.title}” here</Text>
              </Pressable>
            ) : null}
            {dayTasks.map((task) => {
              const metrics = getTaskTimeMetrics(task);
              const durationMinutes = metrics?.durationMinutes ?? task.estimate_minutes ?? null;
              const durationText = durationMinutes ? formatDuration(durationMinutes) : null;
              const detailText = formatTaskStartTime(task);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleStatus={onToggleTask}
                  onPress={() => onOpenTask(task)}
                  badgeText={durationText}
                  detailText={detailText}
                />
              );
            })}
            <AddTaskInput placeholder="Add a task" onSubmit={(title) => onAddTask(day.key, title)} />
          </View>
        );
      }}
    />
  );
}

function formatTaskStartTime(task: LocalTask) {
  if (!task.planned_start) return null;
  const date = new Date(task.planned_start);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(minutes: number) {
  if (!minutes || Number.isNaN(minutes)) return null;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}
