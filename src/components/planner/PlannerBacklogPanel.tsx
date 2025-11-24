import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "../../contexts/ThemeContext";
import type { RemoteList } from "../../hooks/useLists";
import type { LocalTask } from "../../lib/db";
import { AddTaskInput } from "../AddTaskInput";
import { ListTaskItem } from "../ListTaskItem";
import {
  BACKLOG_LIST_HEADER_ID_PREFIX,
  BACKLOG_LIST_ZONE_ID_PREFIX,
  type PlannerListHoverTarget,
  resolvePlannerDropTarget,
} from "./drag/dropTargets";
import { usePlannerStyles } from "./PlannerStylesContext";
import type { PlannerDragPreview } from "./types";

export type PlannerBacklogPanelProps = {
  lists: RemoteList[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  tasksByList: Record<string, LocalTask[]>;
  isLoading: boolean;
  onAddTask: (listId: string, title: string) => Promise<void>;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onCreateList: () => void;
  onOpenTask: (task: LocalTask) => void;
  onDeleteList: (list: RemoteList) => void;
  undeletableListId: string | null;
  onMoveTask: (task: LocalTask, targetListId: string) => void | Promise<void>;
  onReorderTask: (task: LocalTask, listId: string, targetTaskId: string | null, position: "before" | "after") => void | Promise<void>;
  onDragPreviewChange?: (preview: PlannerDragPreview | null) => void;
  onAssignTaskToDay?: (task: LocalTask, dayKey: string) => void | Promise<void>;
  onAssignTaskToSlot?: (task: LocalTask, dayKey: string, hour: number) => void | Promise<void>;
  onCalendarPreviewChange?: (preview: { task: LocalTask; dayKey: string; startMinutes: number } | null) => void;
  onDayHoverChange?: (dayKey: string | null) => void;
  externalHoverTarget?: PlannerListHoverTarget | null;
};

export function PlannerBacklogPanel({
  lists,
  activeListId,
  onSelectList,
  tasksByList,
  isLoading,
  onAddTask,
  onToggleTask,
  onCreateList,
  onOpenTask,
  onDeleteList,
  undeletableListId,
  onMoveTask,
  onReorderTask,
  onDragPreviewChange,
  onAssignTaskToDay,
  onAssignTaskToSlot,
  onCalendarPreviewChange,
  onDayHoverChange,
  externalHoverTarget,
}: PlannerBacklogPanelProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0];
  const [showAllLists, setShowAllLists] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
  const [internalHoverTarget, setInternalHoverTarget] = useState<PlannerListHoverTarget | null>(null);
  const hasMultipleLists = lists.length > 1;
  const draggingTaskRef = useRef<LocalTask | null>(null);
  const hoverTarget = externalHoverTarget ?? internalHoverTarget;
  const visibleLists = useMemo(() => {
    if (showAllLists) return lists;
    return activeList ? [activeList] : [];
  }, [showAllLists, lists, activeList]);

  const handleToggleExpand = (listId: string) => {
    setExpandedLists((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  const handleDragStart = useCallback(
    (task: LocalTask, x: number, y: number) => {
      draggingTaskRef.current = task;
      onCalendarPreviewChange?.(null);
      onDragPreviewChange?.({ task, x, y, variant: "backlog" });
    },
    [onCalendarPreviewChange, onDragPreviewChange],
  );

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      const task = draggingTaskRef.current;
      if (!task) return;
      let previewVariant: PlannerDragPreview["variant"] = "backlog";
      if (Platform.OS === "web") {
        const target = resolvePlannerDropTarget(x, y, task.id);
        if (target?.type === "task") {
          setInternalHoverTarget({ type: "task", listId: target.listId, taskId: target.taskId, position: target.position });
          onDayHoverChange?.(null);
          onDragPreviewChange?.({ task, x, y, variant: previewVariant });
          return;
        }
        if (target?.type === "list") {
          setInternalHoverTarget({ type: "list", listId: target.listId });
          onDayHoverChange?.(null);
          onDragPreviewChange?.({ task, x, y, variant: previewVariant });
          return;
        }
        if (target?.type === "calendarSlot") {
          previewVariant = "calendar";
          setInternalHoverTarget(null);
          onDayHoverChange?.(target.dayKey);
          onCalendarPreviewChange?.({
            task,
            dayKey: target.dayKey,
            startMinutes: target.hour * 60,
          });
          onDragPreviewChange?.({ task, x, y, variant: previewVariant });
          return;
        }
        if (target?.type === "day") {
          previewVariant =
            target.origin === "taskBoard" ? "taskBoard" : target.origin === "daily" ? "backlog" : "calendar";
          setInternalHoverTarget(null);
          onDayHoverChange?.(target.dayKey);
          if (previewVariant === "calendar") {
            onCalendarPreviewChange?.({
              task,
              dayKey: target.dayKey,
              startMinutes: 0,
            });
          } else {
            onCalendarPreviewChange?.(null);
          }
          onDragPreviewChange?.({ task, x, y, variant: previewVariant });
          return;
        }
      }
      onCalendarPreviewChange?.(null);
      onDragPreviewChange?.({ task, x, y, variant: previewVariant });
      onDayHoverChange?.(null);
      setInternalHoverTarget(null);
    },
    [onCalendarPreviewChange, onDayHoverChange, onDragPreviewChange],
  );

  const handleDragRelease = useCallback(
    (x: number, y: number) => {
      const task = draggingTaskRef.current;
      draggingTaskRef.current = null;
      onDragPreviewChange?.(null);
      setInternalHoverTarget(null);
      onDayHoverChange?.(null);
      onCalendarPreviewChange?.(null);
      if (!task) return;
      if (Platform.OS === "web") {
        const target = resolvePlannerDropTarget(x, y, task.id);
        if (target?.type === "task") {
          onReorderTask(task, target.listId, target.taskId, target.position);
          return;
        }
        if (target?.type === "list") {
          onMoveTask(task, target.listId);
          return;
        }
        if (target?.type === "calendarSlot" && onAssignTaskToSlot) {
          onAssignTaskToSlot(task, target.dayKey, target.hour);
          return;
        }
        if (target?.type === "day" && onAssignTaskToDay) {
          onAssignTaskToDay(task, target.dayKey);
          return;
        }
      }
    },
    [onAssignTaskToDay, onAssignTaskToSlot, onCalendarPreviewChange, onDayHoverChange, onDragPreviewChange, onMoveTask, onReorderTask],
  );

  const handleDragCancel = useCallback(() => {
    draggingTaskRef.current = null;
    onDragPreviewChange?.(null);
    setInternalHoverTarget(null);
    onCalendarPreviewChange?.(null);
    onDayHoverChange?.(null);
  }, [onCalendarPreviewChange, onDayHoverChange, onDragPreviewChange]);

  function handleSelectList(listId: string) {
    if (showAllLists) {
      setShowAllLists(false);
    }
    onSelectList(listId);
  }

  return (
    <View style={styles.backlogPanel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelEyebrow}>Lists</Text>
      </View>
      <ScrollView style={styles.drawerListScroll}>
        {hasMultipleLists ? (
          <Pressable
            onPress={() => setShowAllLists((prev) => !prev)}
            style={[styles.drawerListItem, showAllLists && styles.drawerListItemActive]}
          >
            <Text style={[styles.drawerListLabel, showAllLists && styles.drawerListLabelActive]} numberOfLines={1}>
              {showAllLists ? "Hide View All" : "View All Lists"}
            </Text>
            <Ionicons name={showAllLists ? "eye" : "eye-outline"} size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {lists.map((list) => {
          const active = list.id === activeList?.id;
          const disableDelete = list.id === undeletableListId;
          return (
            <Pressable
              key={list.id}
              onPress={() => handleSelectList(list.id)}
              style={[
                styles.drawerListItem,
                active && !showAllLists && styles.drawerListItemActive,
                hoverTarget?.type === "list" && hoverTarget.listId === list.id ? styles.drawerListItemDropTarget : null,
              ]}
              dataSet={{ dragTarget: "listEntry", listId: list.id }}
              collapsable={false}
              nativeID={`${BACKLOG_LIST_HEADER_ID_PREFIX}${list.id}`}
            >
              <Text style={[styles.drawerListLabel, active && styles.drawerListLabelActive]} numberOfLines={1}>
                {list.name ?? "Untitled"}
              </Text>
              {!disableDelete ? (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onDeleteList(list);
                  }}
                  style={styles.listDeleteButton}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable style={styles.newListButton} onPress={onCreateList}>
          <Ionicons name="add" size={14} color={colors.accentMuted} />
          <Text style={styles.newListButtonText}>New List</Text>
        </Pressable>
      </ScrollView>

      <ScrollView style={styles.drawerTasks}>
        {visibleLists.map((list) => {
          const listTasks = tasksByList[list.id] ?? [];
          const listTitle = list.name ?? "Untitled";
          const expanded = showAllLists ? expandedLists[list.id] ?? false : true;
          return (
            <View
              key={list.id}
              style={[styles.listBlock, hoverTarget?.type === "list" && hoverTarget.listId === list.id && styles.listBlockHover]}
              dataSet={{ dragTarget: "listEntry", listId: list.id }}
              collapsable={false}
              nativeID={`${BACKLOG_LIST_ZONE_ID_PREFIX}${list.id}`}
            >
              <Pressable
                style={styles.listBlockHeader}
                onPress={() => (showAllLists ? handleToggleExpand(list.id) : handleSelectList(list.id))}
                dataSet={{ dragTarget: "listEntry", listId: list.id }}
                collapsable={false}
              >
                <Text style={styles.listBlockTitle}>{listTitle}</Text>
                <View style={styles.listBlockHeaderRight}>
                  <Text style={styles.listTaskCount}>{listTasks.length} tasks</Text>
                  {showAllLists ? (
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.textMuted}
                    />
                  ) : null}
                </View>
              </Pressable>
              {expanded ? (
                <>
                  <AddTaskInput placeholder={`Add to ${listTitle}`} onSubmit={(title) => onAddTask(list.id, title)} />
                  {hoverTarget?.type === "list" && hoverTarget.listId === list.id ? <DropIndicator /> : null}
                  {isLoading ? (
                    <ActivityIndicator color={colors.accentMuted} />
                  ) : listTasks.length ? (
                    <View style={styles.listTasksContainer}>
                      {listTasks.map((task, index) => {
                        const isHoveringTask = hoverTarget?.type === "task" && hoverTarget.listId === list.id && hoverTarget.taskId === task.id;
                        const showBeforeIndicator = isHoveringTask && hoverTarget.position === "before";
                        const showAfterIndicator = isHoveringTask && hoverTarget.position === "after";
                        const isLast = index === listTasks.length - 1;
                        return (
                          <View key={task.id} style={styles.listTaskWrapper}>
                            {showBeforeIndicator ? <DropIndicator /> : null}
                            <DraggableTaskRow
                              task={task}
                              listId={list.id}
                              onToggleTask={onToggleTask}
                              onOpenTask={onOpenTask}
                              subtitle={task.notes ?? undefined}
                              onDragStart={handleDragStart}
                              onDragMove={handleDragMove}
                              onDragEnd={handleDragRelease}
                              onDragCancel={handleDragCancel}
                              active={isHoveringTask}
                            />
                            {showAfterIndicator || (isHoveringTask && isLast && hoverTarget.position === "after") ? (
                              <DropIndicator />
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.emptyListText}>No tasks yet</Text>
                  )}
                </>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

type DraggableTaskRowProps = {
  task: LocalTask;
  listId: string;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onOpenTask: (task: LocalTask) => void;
  subtitle?: string | null;
  onDragStart: (task: LocalTask, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragCancel: () => void;
  active: boolean;
};

function DraggableTaskRow({
  task,
  listId,
  onToggleTask,
  onOpenTask,
  subtitle,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  active,
}: DraggableTaskRowProps) {
  const styles = usePlannerStyles();
  const shouldSkipNextPressRef = useRef(false);

  const handleTaskPress = useCallback(
    (nextTask: LocalTask) => {
      if (shouldSkipNextPressRef.current) {
        shouldSkipNextPressRef.current = false;
        return;
      }
      onOpenTask(nextTask);
    },
    [onOpenTask],
  );

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
    <View
      collapsable={false}
      dataSet={{ dragTarget: "backlogTask", listId, taskId: task.id }}
      style={[styles.listTaskWrapperInner, active && styles.listTaskHover]}
    >
      <GestureDetector gesture={gesture}>
        <ListTaskItem
          task={task}
          onToggle={onToggleTask}
          onPress={handleTaskPress}
          subtitle={subtitle}
          active={active}
          showGrabHandle
        />
      </GestureDetector>
    </View>
  );
}

function DropIndicator() {
  const styles = usePlannerStyles();
  return <View style={styles.dropIndicator} />;
}
