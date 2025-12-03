import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "../../../../theme/ThemeContext";
import { usePlannerStyles } from "../../state/PlannerStylesContext";

export type PlannerCreateListModalProps = {
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
            <Pressable
              style={[styles.modalPrimaryButton, (!value.trim() || loading) && styles.modalPrimaryDisabled]}
              disabled={!value.trim() || loading}
              onPress={onSubmit}
            >
              {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.modalPrimaryText}>Create</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
