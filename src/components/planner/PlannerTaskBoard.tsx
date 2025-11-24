import { useCallback, useMemo, useRef, type MutableRefObject } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { ViewToken } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashList as FlashListType } from "@shopify/flash-list";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AddTaskInput } from "../AddTaskInput";
import { TaskCard } from "../TaskCard";
import type { LocalTask } from "../../lib/db";
import { usePlannerStyles } from "./PlannerStylesContext";
import type { PlannerDay, PlannerDragPreview } from "./types";
import { DAY_COLUMN_WIDTH } from "./time";
import { getTaskTimeMetrics } from "./taskTime";
import { formatDuration, formatTaskStartTime } from "./taskDisplay";
import { resolvePlannerDropTarget, type PlannerDropTarget, type PlannerListHoverTarget } from "./drag/dropTargets";

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
  dropHoverDayKey?: string | null;
  onDragPreviewChange?: (preview: PlannerDragPreview | null) => void;
  onDayHoverChange?: (dayKey: string | null) => void;
  onListHoverChange?: (target: PlannerListHoverTarget | null) => void;
  onCalendarPreviewChange?: (preview: { task: LocalTask; dayKey: string; startMinutes: number } | null) => void;
  onDropTaskOnDay?: (task: LocalTask, dayKey: string, startMinutes?: number, endMinutes?: number) => void | Promise<void>;
  onDropTaskOnList?: (
    task: LocalTask,
    listId: string,
    targetTaskId?: string | null,
    position?: "before" | "after",
  ) => void | Promise<void>;
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
  dropHoverDayKey,
  onDragPreviewChange,
  onDayHoverChange,
  onListHoverChange,
  onCalendarPreviewChange,
  onDropTaskOnDay,
  onDropTaskOnList,
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
  const draggingTaskRef = useRef<LocalTask | null>(null);
  const hoverTargetRef = useRef<PlannerDropTarget | null>(null);

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

  const handleDragStart = useCallback(
    (task: LocalTask, x: number, y: number) => {
      draggingTaskRef.current = task;
      onCalendarPreviewChange?.(null);
      onDragPreviewChange?.({ task, x, y, variant: "taskBoard" });
    },
    [onCalendarPreviewChange, onDragPreviewChange],
  );

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      const task = draggingTaskRef.current;
      if (!task) return;
      let previewVariant: PlannerDragPreview["variant"] = "taskBoard";
      if (Platform.OS !== "web") {
        onDragPreviewChange?.({ task, x, y, variant: previewVariant });
        return;
      }
      const target = resolvePlannerDropTarget(x, y, task.id);
      hoverTargetRef.current = target;
      if (target?.type === "calendarSlot") {
        previewVariant = "calendar";
        onDayHoverChange?.(target.dayKey);
        onListHoverChange?.(null);
        onCalendarPreviewChange?.({
          task,
          dayKey: target.dayKey,
          startMinutes: target.hour * 60,
        });
        onDragPreviewChange?.({ task, x, y, variant: previewVariant });
        return;
      }
      if (target?.type === "day") {
        onDayHoverChange?.(target.dayKey);
        onListHoverChange?.(null);
        onCalendarPreviewChange?.(null);
        onDragPreviewChange?.({ task, x, y, variant: previewVariant });
        return;
      } else if (target?.type === "list" || target?.type === "task") {
        onDayHoverChange?.(null);
        onListHoverChange?.(
          target.type === "list"
            ? target
            : { type: "task", listId: target.listId, taskId: target.taskId, position: target.position },
        );
        onCalendarPreviewChange?.(null);
        onDragPreviewChange?.({ task, x, y, variant: previewVariant });
        return;
      }
      onDayHoverChange?.(null);
      onListHoverChange?.(null);
      onCalendarPreviewChange?.(null);
      onDragPreviewChange?.({ task, x, y, variant: previewVariant });
    },
    [onCalendarPreviewChange, onDayHoverChange, onDragPreviewChange, onListHoverChange],
  );

  const finalizeDrag = useCallback(
    (commit: boolean, x?: number, y?: number) => {
      const task = draggingTaskRef.current;
      draggingTaskRef.current = null;
      const target =
        Platform.OS === "web" && x !== undefined && y !== undefined
          ? resolvePlannerDropTarget(x, y, task?.id ?? undefined)
          : hoverTargetRef.current;
      hoverTargetRef.current = null;
      onDragPreviewChange?.(null);
      onCalendarPreviewChange?.(null);
      onDayHoverChange?.(null);
      onListHoverChange?.(null);
      if (!commit || !task || !target) return;
      if (target.type === "calendarSlot" && onDropTaskOnDay) {
        const metrics = getTaskTimeMetrics(task);
        const duration = Math.max(15, metrics?.durationMinutes ?? task.estimate_minutes ?? 60);
        const startMinutes = target.hour * 60;
        const endMinutes = Math.min(startMinutes + duration, 24 * 60);
        onDropTaskOnDay(task, target.dayKey, startMinutes, endMinutes);
        return;
      }
      if (target.type === "day" && onDropTaskOnDay) {
        onDropTaskOnDay(task, target.dayKey);
      } else if (onDropTaskOnList && (target.type === "list" || target.type === "task")) {
        onDropTaskOnList(
          task,
          target.listId,
          target.type === "task" ? target.taskId : null,
          target.type === "task" ? target.position : undefined,
        );
      }
    },
    [onCalendarPreviewChange, onDayHoverChange, onDragPreviewChange, onDropTaskOnDay, onDropTaskOnList, onListHoverChange],
  );

  const handleDragEnd = useCallback(
    (x: number, y: number) => {
      finalizeDrag(true, x, y);
    },
    [finalizeDrag],
  );

  const handleDragCancel = useCallback(() => {
    finalizeDrag(false);
  }, [finalizeDrag]);

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
        const dropHovered = dropHoverDayKey === day.key;
        return (
          <View
            style={[
              styles.taskColumn,
              isSelected && styles.taskColumnSelected,
              dropHovered && styles.taskColumnDropTarget,
            ]}
            dataSet={{ dragTarget: "taskColumn", dayKey: day.key }}
            collapsable={false}
          >
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
                <DraggableBoardTaskCard
                  key={task.id}
                  task={task}
                  onToggleStatus={onToggleTask}
                  onOpenTask={onOpenTask}
                  badgeText={durationText}
                  detailText={detailText}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
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

type DraggableBoardTaskCardProps = {
  task: LocalTask;
  onToggleStatus: (task: LocalTask) => Promise<void>;
  onOpenTask: (task: LocalTask) => void;
  badgeText?: string | null;
  detailText?: string | null;
  onDragStart: (task: LocalTask, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragCancel: () => void;
};

function DraggableBoardTaskCard({
  task,
  onToggleStatus,
  onOpenTask,
  badgeText,
  detailText,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: DraggableBoardTaskCardProps) {
  const shouldSkipNextPressRef = useRef(false);

  const handlePress = useCallback(() => {
    if (shouldSkipNextPressRef.current) {
      shouldSkipNextPressRef.current = false;
      return;
    }
    onOpenTask(task);
  }, [onOpenTask, task]);

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .minDistance(6)
      .onStart((event) => {
        shouldSkipNextPressRef.current = true;
        onDragStart(task, event.absoluteX, event.absoluteY);
      })
      .onUpdate((event) => {
        onDragMove(event.absoluteX, event.absoluteY);
      })
      .onEnd((event) => {
        onDragEnd(event.absoluteX, event.absoluteY);
      })
      .onFinalize(() => {
        const resetSkip = () => {
          shouldSkipNextPressRef.current = false;
        };
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(resetSkip);
        } else {
          setTimeout(resetSkip, 0);
        }
        onDragCancel();
      })
      .runOnJS(true);
  }, [onDragCancel, onDragEnd, onDragMove, onDragStart, task]);

  return (
    <GestureDetector gesture={gesture}>
      <TaskCard task={task} onToggleStatus={onToggleStatus} onPress={handlePress} badgeText={badgeText} detailText={detailText} />
    </GestureDetector>
  );
}
