import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import type { LocalTask } from "../../lib/db";
import { usePlannerStyles } from "./PlannerStylesContext";
import type { PlannerDay } from "./types";
import { formatHourLabel, HOURS, HOUR_BLOCK_HEIGHT } from "./time";
import { getTaskTimeMetrics } from "./taskTime";

type PlannerWeekCalendarGridProps = {
  days: PlannerDay[];
  tasksByDay: Record<string, LocalTask[]>;
  pendingTask: LocalTask | null;
  onDropPendingIntoDay: (dayKey: string) => Promise<void>;
  onDropPendingIntoSlot: (dayKey: string, hour: number) => Promise<void>;
  onOpenTask: (task: LocalTask) => void;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onSelectDay: (dayKey: string) => void;
  selectedDayKey: string;
  gridHeight: number;
};

export function PlannerWeekCalendarGrid({
  days,
  tasksByDay,
  pendingTask,
  onDropPendingIntoDay,
  onDropPendingIntoSlot,
  onOpenTask,
  onToggleTask,
  onSelectDay,
  selectedDayKey,
  gridHeight,
}: PlannerWeekCalendarGridProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarGridWrapper}>
      <View style={styles.calendarGrid}>
        <View style={styles.calendarGridHeader}>
          <View style={styles.calendarGridCorner}>
            {pendingTask ? (
              <Pressable onPress={() => onDropPendingIntoDay(days[0]?.key ?? "")}>
                <Text style={styles.bannerLink}>Place “{pendingTask.title}” at start</Text>
              </Pressable>
            ) : null}
          </View>
          {days.map((day) => (
            <Pressable
              key={day.key}
              style={[styles.calendarHeaderCell, day.key === selectedDayKey && styles.calendarHeaderCellSelected]}
              onPress={() => onSelectDay(day.key)}
            >
              <Text style={styles.calendarHeaderDay}>{day.weekday}</Text>
              <Text style={styles.calendarHeaderDate}>{`${day.monthText} ${day.dayNumber}`}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView
          style={[styles.calendarGridScroll, { height: gridHeight }]}
          contentContainerStyle={styles.calendarGridBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.calendarHoursColumn}>
            {HOURS.map((hour, index) => (
              <View key={hour} style={[styles.calendarHourRow, index === HOURS.length - 1 && styles.calendarHourRowLast]}>
                <Text style={styles.calendarHourText}>{formatHourLabel(hour)}</Text>
              </View>
            ))}
          </View>
          {days.map((day) => {
            const dayTasks = (tasksByDay[day.key] ?? []).filter((task) => Boolean(task.planned_start));
            return (
              <View key={day.key} style={styles.calendarDayColumn}>
                <View style={styles.calendarDaySlots}>
                  {HOURS.map((hour, index) => (
                    <Pressable
                      key={`${day.key}-${hour}`}
                      style={[
                        styles.calendarDaySlot,
                        day.key === selectedDayKey && styles.calendarDaySlotSelected,
                        index === HOURS.length - 1 && styles.calendarDaySlotLast,
                      ]}
                      onPress={() => (pendingTask ? onDropPendingIntoSlot(day.key, hour) : undefined)}
                    />
                  ))}
                </View>
                <View style={[styles.calendarDayTasks, { height: HOURS.length * HOUR_BLOCK_HEIGHT }]} pointerEvents="box-none">
                  {dayTasks.map((task) => {
                    const metrics = getTaskTimeMetrics(task);
                    if (!metrics) return null;
                    const top = (metrics.startMinutes / 60) * HOUR_BLOCK_HEIGHT;
                    const height = Math.max(28, (metrics.durationMinutes / 60) * HOUR_BLOCK_HEIGHT);
                    return (
                      <Pressable
                        key={task.id}
                        style={[styles.calendarBlock, styles.calendarBlockFloating, { top, height }]}
                        onPress={() => onOpenTask(task)}
                      >
                        <Text style={styles.calendarBlockText}>{task.title}</Text>
                        <Pressable onPress={() => onToggleTask(task)}>
                          <Ionicons
                            name={task.status === "done" ? "checkmark-circle" : "ellipse-outline"}
                            size={14}
                            color={task.status === "done" ? colors.successAlt : colors.textSecondary}
                          />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
