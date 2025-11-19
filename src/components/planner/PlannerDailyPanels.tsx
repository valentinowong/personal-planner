import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AddTaskInput } from "../AddTaskInput";
import { TaskCard } from "../TaskCard";
import { usePlannerStyles } from "./PlannerStylesContext";
import { PlannerIconButton } from "./PlannerIconButton";
import type { LocalTask } from "../../lib/db";
import type { PlannerDay } from "./types";
import { useTheme } from "../../contexts/ThemeContext";
import { formatHourLabel, HOURS, HOUR_BLOCK_HEIGHT } from "./time";
import { getTaskTimeMetrics } from "./taskTime";

type PlannerDailyTaskPanelProps = {
  day: PlannerDay | undefined;
  tasks: LocalTask[];
  onAddTask: (title: string) => Promise<void>;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onOpenTask: (task: LocalTask) => void;
  onStepDay: (delta: number) => void;
  onToday: () => void;
  disablePrev: boolean;
  disableNext: boolean;
};

export function PlannerDailyTaskPanel({
  day,
  tasks,
  onAddTask,
  onToggleTask,
  onOpenTask,
  onStepDay,
  onToday,
  disablePrev,
  disableNext,
}: PlannerDailyTaskPanelProps) {
  const styles = usePlannerStyles();
  if (!day) return null;

  return (
    <View style={styles.timeboxPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Tasks</Text>
        <View style={styles.panelNav}>
          <PlannerIconButton icon="chevron-back" onPress={() => onStepDay(-1)} disabled={disablePrev} />
          <Pressable style={styles.todayButton} onPress={onToday}>
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
          <PlannerIconButton icon="chevron-forward" onPress={() => onStepDay(1)} disabled={disableNext} />
        </View>
      </View>
      <Text style={styles.timeboxDate}>{`${day.weekday}, ${day.monthText} ${day.dayNumber}`}</Text>
      <AddTaskInput placeholder="Add timed task" onSubmit={onAddTask} />
      <ScrollView style={styles.timeboxList}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onToggleStatus={onToggleTask} onPress={() => onOpenTask(task)} />
        ))}
      </ScrollView>
    </View>
  );
}

type PlannerDailySchedulePanelProps = {
  day: PlannerDay | undefined;
  tasks: LocalTask[];
  pendingTask: LocalTask | null;
  onDropPendingIntoSlot: (dayKey: string, hour: number) => Promise<void>;
  onOpenTask: (task: LocalTask) => void;
  onToggleTask: (task: LocalTask) => Promise<void>;
  onStepDay: (delta: number) => void;
  disablePrev: boolean;
  disableNext: boolean;
  onToday: () => void;
};

export function PlannerDailySchedulePanel({
  day,
  tasks,
  pendingTask,
  onDropPendingIntoSlot,
  onOpenTask,
  onToggleTask,
  onStepDay,
  disablePrev,
  disableNext,
  onToday,
}: PlannerDailySchedulePanelProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  if (!day) return null;
  const scheduledTasks = tasks.filter((task) => Boolean(task.planned_start));

  return (
    <View style={styles.timeboxPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Schedule</Text>
        <View style={styles.panelNav}>
          <PlannerIconButton icon="chevron-back" onPress={() => onStepDay(-1)} disabled={disablePrev} />
          <Pressable style={styles.todayButton} onPress={onToday}>
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
          <PlannerIconButton icon="chevron-forward" onPress={() => onStepDay(1)} disabled={disableNext} />
        </View>
      </View>
      <Text style={styles.timeboxDate}>{`${day.weekday}, ${day.monthText} ${day.dayNumber}`}</Text>
      <ScrollView style={styles.dayScheduleScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.dayScheduleGrid}>
          <View style={styles.calendarHoursColumn}>
            {HOURS.map((hour, index) => (
              <View key={`${day.key}-hour-${hour}`} style={[styles.calendarHourRow, index === HOURS.length - 1 && styles.calendarHourRowLast]}>
                <Text style={styles.calendarHourText}>{formatHourLabel(hour)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.dayScheduleColumn}>
            <View style={styles.dayScheduleSlots}>
              {HOURS.map((hour, index) => (
                <Pressable
                  key={`${day.key}-slot-${hour}`}
                  style={[styles.dayScheduleSlot, index === HOURS.length - 1 && styles.dayScheduleSlotLast]}
                  onPress={() => (pendingTask ? onDropPendingIntoSlot(day.key, hour) : undefined)}
                />
              ))}
            </View>
            <View style={[styles.dayScheduleTasks, { height: HOURS.length * HOUR_BLOCK_HEIGHT }]} pointerEvents="box-none">
              {scheduledTasks.map((task) => {
                const metrics = getTaskTimeMetrics(task);
                if (!metrics) return null;
                const top = (metrics.startMinutes / 60) * HOUR_BLOCK_HEIGHT;
                const height = Math.max(28, (metrics.durationMinutes / 60) * HOUR_BLOCK_HEIGHT);
                return (
                  <Pressable key={task.id} style={[styles.calendarBlock, styles.calendarBlockFloating, { top, height }]} onPress={() => onOpenTask(task)}>
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
        </View>
      </ScrollView>
    </View>
  );
}
