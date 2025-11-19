import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SegmentedControl } from "../SegmentedControl";
import { TaskDetailView } from "../TaskDetailView";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { RemoteList } from "../../hooks/useLists";
import { usePlannerStyles } from "./PlannerStylesContext";
import type { DeleteAction } from "./types";

type PlannerCreateListModalProps = {
  visible: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
};

export function PlannerCreateListModal({ visible, value, onChangeValue, onClose, onSubmit, loading }: PlannerCreateListModalProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>New List</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="List name"
            placeholderTextColor={colors.placeholder}
            value={value}
            onChangeText={onChangeValue}
            autoFocus
          />
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalGhostButton}>
              <Text style={styles.modalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.modalPrimaryButton, (!value.trim() || loading) && styles.modalPrimaryDisabled]} disabled={!value.trim() || loading} onPress={onSubmit}>
              {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.modalPrimaryText}>Create</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PlannerDeleteListModalProps = {
  visible: boolean;
  list: RemoteList | null;
  taskCount: number | null;
  checkingTasks: boolean;
  submitting: boolean;
  inboxList: RemoteList | null;
  lists: RemoteList[];
  onClose: () => void;
  onConfirm: (action: DeleteAction, targetListId?: string | null) => void;
};

export function PlannerDeleteListModal({
  visible,
  list,
  taskCount,
  checkingTasks,
  submitting,
  inboxList,
  lists,
  onClose,
  onConfirm,
}: PlannerDeleteListModalProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  const [action, setAction] = useState<DeleteAction>("delete");
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  useEffect(() => {
    setAction("delete");
    setMoveTargetId(null);
  }, [visible, list?.id]);

  if (!list) return null;

  const listName = list.name ?? "Untitled list";
  const hasTasks = (taskCount ?? 0) > 0;
  const availableTargets = lists.filter((candidate) => candidate.id !== list.id && candidate.id !== inboxList?.id);
  const inboxDisabled = !inboxList || inboxList.id === list.id;
  const otherDisabled = availableTargets.length === 0;

  function selectAction(next: DeleteAction) {
    setAction(next);
    if (next === "move_other") {
      setMoveTargetId((current) => current ?? availableTargets[0]?.id ?? null);
    } else {
      setMoveTargetId(null);
    }
  }

  const confirmDisabled =
    checkingTasks ||
    submitting ||
    (hasTasks && action === "move_other" && (otherDisabled || !moveTargetId)) ||
    (hasTasks && action === "move_inbox" && inboxDisabled);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>{`Delete “${listName}”`}</Text>
          {checkingTasks ? (
            <View style={styles.deleteListStatus}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.deleteListDescription}>Checking tasks in this list…</Text>
            </View>
          ) : hasTasks ? (
            <>
              <Text style={styles.deleteListDescription}>
                This list contains {taskCount} task{taskCount === 1 ? "" : "s"}. Choose what to do with them before deleting the list.
              </Text>
              <View style={styles.deleteOptionGroup}>
                <Pressable style={styles.deleteOptionRow} onPress={() => selectAction("delete")}>
                  <Ionicons name={action === "delete" ? "radio-button-on" : "radio-button-off"} size={18} color={colors.text} />
                  <View style={styles.deleteOptionLabels}>
                    <Text style={styles.deleteOptionTitle}>Delete the tasks</Text>
                    <Text style={styles.deleteOptionSubtitle}>Remove every task in this list forever.</Text>
                  </View>
                </Pressable>
                <Pressable style={[styles.deleteOptionRow, inboxDisabled && styles.deleteOptionDisabled]} onPress={() => !inboxDisabled && selectAction("move_inbox")}>
                  <Ionicons name={action === "move_inbox" ? "radio-button-on" : "radio-button-off"} size={18} color={colors.text} />
                  <View style={styles.deleteOptionLabels}>
                    <Text style={styles.deleteOptionTitle}>Move tasks to Inbox</Text>
                    <Text style={styles.deleteOptionSubtitle}>Keep everything and move it to Inbox.</Text>
                  </View>
                </Pressable>
                <Pressable style={[styles.deleteOptionRow, otherDisabled && styles.deleteOptionDisabled]} onPress={() => !otherDisabled && selectAction("move_other")}>
                  <Ionicons name={action === "move_other" ? "radio-button-on" : "radio-button-off"} size={18} color={colors.text} />
                  <View style={styles.deleteOptionLabels}>
                    <Text style={styles.deleteOptionTitle}>Move tasks to another list</Text>
                    <Text style={styles.deleteOptionSubtitle}>Choose another list to keep these tasks.</Text>
                  </View>
                </Pressable>
              </View>
              {action === "move_other" && !otherDisabled ? (
                <View style={styles.moveListPicker}>
                  {availableTargets.map((target) => {
                    const selected = moveTargetId === target.id;
                    return (
                      <Pressable
                        key={target.id}
                        style={[styles.moveListOption, selected && styles.moveListOptionActive]}
                        onPress={() => setMoveTargetId(target.id)}
                      >
                        <Text style={[styles.moveListOptionText, selected && styles.moveListOptionTextActive]}>
                          {target.name ?? "Untitled"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.deleteListDescription}>Are you sure you want to delete this list? This action cannot be undone.</Text>
          )}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalGhostButton} disabled={submitting}>
              <Text style={styles.modalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(action, moveTargetId)}
              style={[styles.modalPrimaryButton, (confirmDisabled || submitting) && styles.modalPrimaryDisabled]}
              disabled={confirmDisabled || submitting}
            >
              {submitting ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.modalPrimaryText}>Delete list</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PlannerAppSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
  onOpenFullSettings: () => void;
};

export function PlannerAppSettingsModal({ visible, onClose, userEmail, onOpenFullSettings }: PlannerAppSettingsModalProps) {
  const { signOut, session } = useAuth();
  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined) ??
    (session?.user.user_metadata?.full_name as string | undefined) ??
    (session?.user.user_metadata?.name as string | undefined) ??
    "";
  const headerLabel = displayName || userEmail || "You";
  const initials = headerLabel
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  const styles = usePlannerStyles();
  const { colors, preference, setPreference } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [rollover, setRollover] = useState(true);
  const [autoTheme, setAutoTheme] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Unable to sign out", message);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.settingsModalCard} onPress={(event) => event.stopPropagation()}>
          <View style={styles.settingsHeader}>
            <View style={styles.settingsHeaderInfo}>
              <View style={styles.settingsAvatar}>
                <Text style={styles.settingsAvatarText}>{initials || "U"}</Text>
              </View>
              <View>
                <Text style={styles.settingsUserName}>{displayName || userEmail}</Text>
                <Text style={styles.settingsUserEmail}>{userEmail}</Text>
              </View>
            </View>
            <Pressable
              style={[styles.settingsSignOutButton, signingOut && styles.settingsSignOutButtonDisabled]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? <ActivityIndicator size="small" color={colors.dangerText} /> : <Text style={styles.settingsSignOutText}>Sign Out</Text>}
            </Pressable>
          </View>
          <ScrollView style={styles.settingsModalScroll} contentContainerStyle={styles.settingsModalScrollContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Appearance</Text>
              <SegmentedControl
                size="sm"
                value={preference}
                options={[
                  { label: "System", value: "system" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                ]}
                onChange={(next) => setPreference(next as typeof preference)}
              />
              <PlannerSettingsToggleRow label="Auto-dark mode at sunset" value={autoTheme} onValueChange={setAutoTheme} />
            </View>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Behaviors</Text>
              <PlannerSettingsToggleRow label="Roll over incomplete tasks" value={rollover} onValueChange={setRollover} />
              <PlannerSettingsToggleRow label="Notifications" value={notifications} onValueChange={setNotifications} />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onOpenFullSettings} style={styles.modalPrimaryButton}>
              <Text style={styles.modalPrimaryText}>Open settings</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.modalGhostButton}>
              <Text style={styles.modalGhostText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PlannerTaskDetailModalProps = {
  taskId: string | null;
  onClose: () => void;
};

export function PlannerTaskDetailModal({ taskId, onClose }: PlannerTaskDetailModalProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  return (
    <Modal visible={Boolean(taskId)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.taskDetailModalCard} onPress={(event) => event.stopPropagation()}>
          <View style={styles.taskDetailHeader}>
            <Text style={styles.taskDetailTitle}>Task Details</Text>
            <Pressable onPress={onClose} style={styles.taskDetailClose}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>
          {taskId ? <TaskDetailView taskId={taskId} scrollStyle={styles.taskDetailScroll} contentStyle={styles.taskDetailContent} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PlannerSettingsToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (next: boolean) => void }) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.settingsToggleRow}>
      <Text style={styles.settingsToggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} thumbColor={colors.surface} trackColor={{ true: colors.accent, false: colors.borderMuted }} />
    </View>
  );
}
