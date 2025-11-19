import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AddTaskInput } from "../AddTaskInput";
import { ListTaskItem } from "../ListTaskItem";
import { useTheme } from "../../contexts/ThemeContext";
import type { RemoteList } from "../../hooks/useLists";
import type { LocalTask } from "../../lib/db";
import { usePlannerStyles } from "./PlannerStylesContext";

export type PlannerBacklogPanelProps = {
  lists: RemoteList[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  tasksByList: Record<string, LocalTask[]>;
  isLoading: boolean;
  onAddTask: (listId: string, title: string) => Promise<void>;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onBeginSchedule: (task: LocalTask) => void;
  onCreateList: () => void;
  onOpenTask: (task: LocalTask) => void;
  onDeleteList: (list: RemoteList) => void;
  undeletableListId: string | null;
};

export function PlannerBacklogPanel({
  lists,
  activeListId,
  onSelectList,
  tasksByList,
  isLoading,
  onAddTask,
  onToggleTask,
  onBeginSchedule,
  onCreateList,
  onOpenTask,
  onDeleteList,
  undeletableListId,
}: PlannerBacklogPanelProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0];
  const [showAllLists, setShowAllLists] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
  const hasMultipleLists = lists.length > 1;

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
              style={[styles.drawerListItem, active && !showAllLists && styles.drawerListItemActive]}
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
            <View key={list.id} style={styles.listBlock}>
              <Pressable
                style={styles.listBlockHeader}
                onPress={() => (showAllLists ? handleToggleExpand(list.id) : handleSelectList(list.id))}
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
                  {isLoading ? (
                    <ActivityIndicator color={colors.accentMuted} />
                  ) : listTasks.length ? (
                    <View style={styles.listTasksContainer}>
                      {listTasks.map((task) => (
                        <ListTaskItem
                          key={task.id}
                          task={task}
                          onToggle={onToggleTask}
                          onPress={() => onOpenTask(task)}
                          subtitle={task.notes ?? undefined}
                          onBeginDrag={onBeginSchedule}
                        />
                      ))}
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
