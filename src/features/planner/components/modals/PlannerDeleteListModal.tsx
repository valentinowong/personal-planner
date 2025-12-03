import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../theme/ThemeContext";
import type { RemoteList } from "../../hooks/useLists";
import { usePlannerStyles } from "../../state/PlannerStylesContext";
import type { DeleteAction } from "../../types";

export type PlannerDeleteListModalProps = {
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
                <Pressable
                  style={[styles.deleteOptionRow, inboxDisabled && styles.deleteOptionDisabled]}
                  onPress={() => !inboxDisabled && selectAction("move_inbox")}
                >
                  <Ionicons name={action === "move_inbox" ? "radio-button-on" : "radio-button-off"} size={18} color={colors.text} />
                  <View style={styles.deleteOptionLabels}>
                    <Text style={styles.deleteOptionTitle}>Move tasks to Inbox</Text>
                    <Text style={styles.deleteOptionSubtitle}>Keep everything and move it to Inbox.</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.deleteOptionRow, otherDisabled && styles.deleteOptionDisabled]}
                  onPress={() => !otherDisabled && selectAction("move_other")}
                >
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
